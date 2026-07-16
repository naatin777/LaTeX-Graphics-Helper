# Safe Mode仕様

## 目的

変換結果の出力先に既存ファイルがある場合の動作を明示し、意図しない上書きを防ぐ。

## 状態

- 初期値はON
- 状態は`ExtensionContext.globalState`へ保存する
- 状態はVS Codeプロファイル全体で共通とする
- status barにNLSの`Safe Mode: ON`または`Safe Mode: OFF`を表示する
- status barを選択するとON/OFFを切り替える

## Safe Mode ON

1回の変換で競合する出力が1件以上ある場合、出力反映前に確認を1回だけ表示する。

選択肢:

- 両方残す
- 上書きしない
- 上書きする

独立した「キャンセル」は表示しない。

「上書きしない」をダイアログの閉じる選択として扱う。ESCまたはダイアログを閉じた場合も「上書きしない」と同じく全体停止する。

選択は、その変換に含まれるすべての競合出力へ適用する。

## 両方残す

既存ファイルを変更せず、変換結果のファイル名へ連番を付ける。

例:

```text
sample.pdf
sample-1.pdf
sample-2.pdf
```

拡張子の直前へ`-<番号>`を付け、存在しない最小の正整数を使用する。

同じ変換内で採用済みの出力パスとも重複させない。

## 上書きしない

指定出力先へ何も反映せず、変換全体を停止する。

競合解決をキャンセルした場合は、今回のstagingを削除する。

## 上書きする

既存ファイルを`.latex-graphics-helper/`内へバックアップしてから上書きする。

バックアップ作成と上書きの前にworkspace境界を検証する。

出力反映途中で失敗した場合は、今回作成したファイルを削除し、上書きしたファイルをバックアップから復元する。

## Safe Mode OFF

確認を表示せず「上書きする」を適用する。

OFFの場合も、Undoと失敗時復元のため既存ファイルをバックアップする。

## stagingとbackupの寿命

- 変換失敗またはキャンセル時は、今回のstagingを削除する。
- 成功時は、Undo recordが必要とする上書き前backupだけを保持し、生成結果や入力コピーなどのstagingは削除する。
- 新しいUndo recordを記録したとき、古いrecordのartifactを削除する。新しいrecordの作成に失敗した場合は、古いrecordを保持する。
- Undo成功後は、そのrecordのbackupを含むartifactを削除する。cleanup失敗は変換やUndoの成功を取り消さない。
- 拡張機能起動時は`.latex-graphics-helper/`全体を削除しない。別windowのactive staging、Undo backup、未知directory、harness logを保護する。
- Windows外部toolの診断用ASCII scratchは別管理とし、失敗時に保持できる。

## 直前の変換取消

- 新規作成した出力は削除する
- 両方残すで作成した出力は削除する
- 上書きした出力は、生成後から変更されていない場合だけバックアップから元ファイルを復元する
- 出力またはバックアップの変更、欠損、workspace境界違反が1件でもあれば何も取り消さない

## 初期対象

- `cropPdf.auto`
- `splitPdf.allPages`
- `convertPngToPdf`
- `mergePdf.selectedFiles`
- クリップボード画像のLaTeX挿入

PNG変換で複数ファイルを選択した場合は、すべての変換を作業領域で完了してから競合確認を1回だけ行い、全出力へ同じ判断を適用する。
