# v1公開前の安全性・一貫性を修正する

## Status

Done

## Change Contract

Problem:

Mergeの通知件数、Clipboard PasteのUndo失敗、Merge入力検証、stagingの寿命、公開command登録、READMEとOutput Channelの説明が実装と一致していない。

Observable behavior:

結合件数は入力PDF数を表示し、Undoが利用できなくてもClipboard Pasteは保存済みファイルを使ってLaTeXを挿入する。不正なMerge選択は処理開始前に拒否され、変換失敗・キャンセル・Undo完了後に不要なstagingを残さない。

Affected boundaries:

Merge command/operation、Clipboard Paste provider、commit/Undo artifact lifecycle、extension activationとcommand registration、READMEおよび関連仕様。

Files expected to change:

`src/commands/merge_pdf.ts`、`src/edit_provider/latex_paste_edit_provider.ts`、`src/operations/commit_conversion_outputs.ts`、`src/operations/undo_last_conversion.ts`、関連テスト・README・spec/ADR。

Evidence:

入力件数通知、Undo記録失敗、不正選択、競合・Undo・cleanup・キャンセル、manifest/menu/登録整合性を実ファイルと外部から見た通知で検証する。

Not changing:

変換系全体の共通化、Webview再設計、外部CLI runner、依存追加、永続Undo、release matrix、今回の安全性境界と無関係な整理。

## 完了条件

- [x] Change Contractの挙動を実装する
- [x] 関連するspec/ADR/READMEを現行挙動に合わせる
- [x] 正式なcheckを実行する
