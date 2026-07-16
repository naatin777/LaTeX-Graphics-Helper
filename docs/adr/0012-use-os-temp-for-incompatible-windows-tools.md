# ADR-0012: Unicode非互換のWindows外部コマンドにはOS一時scratchを使う

## ステータス

採用

## 日付

2026-07-11

## 背景

Windows実体によるpath probeで、Ghostscript、pdftocairo、rsvg-convertの一部配布物がUnicodeを含む入出力pathを正しく扱えないことを確認した。

workspace内の`.latex-graphics-helper`でfile名をASCIIへ変えても、workspace自体のabsolute pathに日本語・絵文字などが含まれる場合は外部コマンドへ渡すpath全体をASCIIにできない。

一方、Safe Mode、Undo、失敗時復元をOS一時directoryへ依存させると、OS cleanupや第三者processによる削除の影響を受ける。

## 決定

Windowsで実測上Unicode非互換だった外部コマンドに直接渡す入出力だけを、OS一時directory内のランダムなASCII scratchへコピーする。

OS一時scratchは外部コマンド実行のためだけに使う。次は引き続きworkspace内で管理する。

- Safe Modeの競合判断
- 上書き前backup
- Undo記録
- 完成した変換結果の反映前staging
- ユーザー指定outputPath

## 理由

- Unicodeを含むworkspace absolute pathから外部コマンドを分離できる
- 元fileとユーザー指定出力を外部コマンドへ直接渡さずに済む
- OS一時directoryの消失をSafe ModeやUndoの正しさへ影響させない
- workspace外操作の例外を、実測で必要と判明した3 toolのscratchへ限定できる

## 代替案

### workspace内でASCII file名だけを使う

workspace自体がUnicode pathの場合に解決しないため採用しない。

### すべての変換作業をOS一時directoryへ移す

Safe Mode backupとUndoが一時directoryの寿命へ依存し、変更範囲も大きくなるため採用しない。

### Windows pathの`\\`を`/`へ変換する

実測ではseparatorによる結果差がなく、Unicode encoding問題を解決しなかったため採用しない。

### Unicode workspaceを一律に拒否する

OS一時scratchで安全に回避できる範囲まで利用不能にするため採用しない。

## 結果・影響

- extensionがworkspace外へ書き込む限定的な例外が増える
- scratch rootの境界検証とASCII検証が必要になる
- 入出力copyとcleanupのI/Oが増える
- 失敗・cancel時の診断用scratchがOS一時directoryに残る
- OS一時directoryにもASCII pathを確保できない場合は変換を開始できない

## 運用ルール

- 対象はWindowsのGhostscript、pdftocairo、rsvg-convertだけとする
- Draw.ioとqpdfには適用しない
- user設定で任意のscratch base pathを指定できるようにしない
- `mkdtemp`でrunごとに推測困難な専用directoryを作る
- 外部コマンドへはscratch内の固定ASCII名だけを渡す
- shell command文字列へpathを埋め込まず、実行fileと引数配列を分ける
- 成功時は完成fileをworkspace側へcopyしてからscratchを削除する
- 失敗・cancel時はscratchを残し、Output channelへ診断用pathを記録する
- scratchはSafe ModeとUndoの対象にしない

## 見直す条件

- 対象toolのWindows配布物がUnicode pathへ正式対応した場合
- OS一時directoryへ機密性の高い入力をcopyすることが問題になった場合
- scratch cleanupまたはdisk使用量が問題になった場合
- Node.jsだけで安全なUnicode対応pathを外部toolへ渡せる方法が確認できた場合

## 関連

- [ファイル変換はworkspace内の作業領域で行う](0006-use-workspace-staging-for-file-operations.md)
- [外部コマンド用ASCII scratch仕様](../specs/internal/external-tool-ascii-scratch.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)
