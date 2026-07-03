# タスク: LaTeX挿入機能の失敗テストを追加する

## Status

Done

## 目的

`v0.5.1` で提供されていた、ファイルdragとクリップボードpasteによるLaTeX挿入機能を復元する前に、失敗テストを追加する。

対象機能:

- PDFファイルをLaTeX文書へdrag & dropして `figure` / `includegraphics` snippetを挿入する
- 複数PDFファイルをLaTeX文書へdrag & dropして `subfigure` 相当のsnippetを挿入する
- クリップボード画像をLaTeX文書へpasteして、画像ファイルまたはPDFを保存し、LaTeX snippetを挿入する

## 完了条件

- `DocumentDropEditProvider` がPDF URIのdropからLaTeX snippetを作ることをテストする
- 複数PDF URIのdropから複数図用LaTeX snippetを作ることをテストする
- `DocumentPasteEditProvider` がclipboard画像からLaTeX snippetを作ることをテストする
- clipboard画像の保存先が `outputPath.clipboardImage` 相当の設定で変えられることをテストする
- figure / subfigure関連settingsがsnippet候補に反映されることをテストする
- 実装未完了を理由に追加テストが失敗することを確認する

## 変更可能なファイル

- `test/`
- `docs/tasks/0116-add-latex-insertion-settings-tests.md`

## 対象外

- `src/` の実装変更
- `package.json` の変更
- LaTeX snippet仕様の再設計
- drag & drop対象をPDF以外へ広げること

## 関連

- [0112: v0.5.1公開機能との差分を整理する](0112-track-v051-public-feature-parity.md)

## 確認方法

- `pnpm run check:test`
- 必要なら `CI=true pnpm run test:vscode`

## 確認結果

- `CI=true pnpm run check:test`
  - 期待通り失敗
  - 理由: `src/edit_provider/latex_drop_edit_provider.js` と `src/edit_provider/latex_paste_edit_provider.js` が未実装
