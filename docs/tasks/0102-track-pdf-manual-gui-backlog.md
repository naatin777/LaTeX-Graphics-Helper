# タスク: PDF manual GUI機能の未実装範囲を整理する

## Status

Done

## 目的

PDF crop / split / merge のmanual GUI機能について、現在の未実装範囲とlocalブランチに残っている参考実装を整理する。

## 調査結果

現行 `package.json` には以下のコマンドが定義されている。

- `latex-graphics-helper.cropPdf.manual`
- `latex-graphics-helper.splitPdf.manual`
- `latex-graphics-helper.mergePdf.selectedPages`
- `latex-graphics-helper.mergePdf.manual`

ただし、現行 `src/extension.ts` ではこれらのmanual GUI系コマンドは登録されていない。

現行の `webview/apps/crop_pdf` と `webview/apps/merge_pdf` は、PDFの最初のページ表示を検証するための基礎実装であり、実際のmanual操作は未完成。

`local/refactor-ddd-architecture` には custom crop GUI の実装断片がある。

実装していたこと:

- Webview panelを開く
- PDF.jsでPDFを表示する
- ページ一覧を表示する
- ページを選択してcrop画面へ移動する
- crop枠をドラッグ調整する
- WebviewからHostへ `{ type: "apply", page, bbox }` 相当のメッセージを送る
- Host側でbbox指定のcropを実行する

ただし、`local/refactor-ddd-architecture` は大規模リファクタと混ざっているため、そのまま移植しない。

`local/vscode-services-refactor` はEffect / service layerの大規模リファクタであり、PDF manual GUI機能の直接の参考にはしない。

## 完了条件

- PDF manual GUI系コマンドの未実装範囲が明記されている
- localブランチの参考にしてよい点が明記されている
- localブランチをそのまま採用しない理由が明記されている
- 個別タスクへ分割されている

## 変更可能なファイル

- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/tasks/0102-track-pdf-manual-gui-backlog.md`
- 新規 `docs/tasks/*.md`
- `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- localブランチのcherry-pick
- Webview構成の変更

## 関連

- [0048: 未実装・保留事項を整理する](0048-track-unimplemented-work.md)
- [0006: WebviewにPDFの最初のページを表示する](0006-render-first-pdf-page-in-webviews.md)
- [0008: cropPdf.autoを安全な作業領域で実装する](0008-implement-safe-auto-crop.md)
- [0019: splitPdf.allPagesを安全に実装する](0019-implement-split-pdf-all-pages.md)

## 確認方法

- `git diff --check`
- `docs/tasks/README.md` のTodo確認
