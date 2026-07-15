# ADR-0006: ファイル変換はworkspace内の作業領域で行う

## ステータス

採用

## 日付

2026-06-21

## 背景

PDFや画像の変換処理で元ファイルを直接操作すると、コマンドやパスの誤りによってユーザーのファイルを上書きする危険がある。

外部コマンドの実行途中で失敗した場合も、元ファイルと完成途中の出力を明確に分離する必要がある。

## 決定

変換対象はworkspace直下の `.latex-graphics-helper/` へコピーし、コピーに対して変換処理を行う。

全変換が成功するまで指定出力先には反映しない。完成ファイルを出力先へ反映する処理と、内部作業領域での処理を分離する。

ただし、WindowsでUnicode pathを扱えないことが実測された外部コマンドについては、[ADR-0012](0012-use-os-temp-for-incompatible-windows-tools.md)で定義するOS一時scratchを例外として使用する。Safe Mode、Undo、backup、完成fileの反映単位は引き続きworkspace内で管理する。

## 理由

- 元ファイルを誤って上書きするリスクを下げられる
- 途中失敗時の作業内容を確認できる
- 将来、出力反映だけを `vscode.WorkspaceEdit` のUndo対象にできる
- ユーザーが内部作業ファイルを意識せずに済む

## 結果・影響

- workspace内に処理中の作業ファイルが作成され、成功後は不要なものが削除される
- 同じ変換でも一時的に追加のディスク容量を使う
- 変換処理と出力反映処理を分けて実装する必要がある
- `.latex-graphics-helper/` はユーザー向けの変換結果ではなく、内部作業領域として扱う

## 運用ルール

- 元ファイルは読み取りと作業領域へのコピーだけに使用する
- 作業領域は `<workspace>/.latex-graphics-helper/<operation>/<一意ID>/` とする
- OS一時scratchはADR-0012の対象toolと用途だけに限定する
- 作業ファイルは成功後に不要なものを削除し、上書き前backupだけを現在のUndo recordのために保持する
- 変換失敗・キャンセル時は今回のoperation rootだけを削除する。拡張機能起動時にworkspace直下のruntime root全体を削除しない。
- crash後の残骸は次回起動時に自動削除せず、別window・別session・Undo backup・診断ログを誤削除しないことを優先する。
- 外部コマンドへ渡すファイルパスを、スクリプトやコード文字列へ埋め込まない
- 外部コマンドは必要最小限の責務に限定し、PDF内部の変更は利用中のライブラリで扱える場合はライブラリを使用する
- パステンプレートは1回だけ解析し、置換後の値を再度テンプレートとして解釈しない
- `execPath` を除き、読み書き対象は論理パスと実体パスの両方がworkspace内であることを確認する
- workspace内のsymlinkを経由してworkspace外へ出る操作を拒否する
- 複数変換はすべて成功してから出力先へ反映する
- 出力反映に失敗した場合、今回反映した出力だけを戻す
- 将来のUndo対象は変換後ファイルの反映だけとし、内部作業領域は対象外とする

## 見直す条件

- 作業ファイルによるディスク使用量が問題になったとき
- `WorkspaceEdit` では必要なUndo操作を表現できないと判明したとき
- workspace外の入力や出力を正式にサポートするとき

## 関連

- `AGENTS.md`
- `docs/tasks/0008-implement-safe-auto-crop.md`
- `docs/tasks/0009-restrict-file-operations-to-workspace.md`
- `docs/tasks/0010-use-workspace-edit-for-output-commit.md`
