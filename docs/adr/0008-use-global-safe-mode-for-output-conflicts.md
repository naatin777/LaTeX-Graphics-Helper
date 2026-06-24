# ADR-0008: 出力競合をglobal Safe Modeで制御する

## ステータス

採用

## 日付

2026-06-22

## 背景

変換先に既存ファイルがある場合、常に停止すると安全だが、繰り返し変換時の操作性が低い。

無条件上書きでは誤操作時の復元ができない。

## 決定

Safe Modeの状態を`ExtensionContext.globalState`へ保存し、status barから切り替える。

Safe Mode ONでは、競合時に「両方残す」「上書きしない」「上書きする」を1回だけ確認する。

Safe Mode OFFでは確認せず上書きする。

上書き前はSafe Modeの状態にかかわらずバックアップを作成し、失敗時と直前変換取消時に復元できるようにする。

## 理由

- 初期値ONで意図しない上書きを防げる
- 頻繁に上書きするユーザーはOFFへ切り替えられる
- 通常Undoのkeybindingを奪わず、専用取消commandから復元できる
- 状態をglobalにすることでworkspaceごとの切り替えを不要にできる

## 結果・影響

- Safe Modeの状態は全workspaceで共通になる
- 上書き時はバックアップ分のディスク容量を使用する
- PNG変換など直接出力する処理は、作業領域へ統合してから対応する

## 関連

- `docs/specs/safe-mode.md`
- `docs/specs/undo-last-conversion.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/adr/0007-use-dedicated-command-to-undo-last-conversion.md`
