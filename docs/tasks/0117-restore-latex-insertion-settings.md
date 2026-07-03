# タスク: ファイルdragとクリップボードpasteによるLaTeX挿入を復元する

## Status

Done

## 目的

追加済みの失敗テストを通す最小範囲で、`v0.5.1` で提供されていたLaTeX挿入機能を現行構成へ復元する。

対象機能:

- PDFファイルをLaTeX文書へdrag & dropして `figure` / `includegraphics` snippetを挿入する
- 複数PDFファイルをLaTeX文書へdrag & dropして `subfigure` 相当のsnippetを挿入する
- クリップボード画像をLaTeX文書へpasteして、画像ファイルまたはPDFを保存し、LaTeX snippetを挿入する

## 完了条件

- `DocumentDropEditProvider` 相当のproviderが登録されている
- `DocumentPasteEditProvider` 相当のproviderが登録されている
- PDF drag & dropでLaTeX snippetを挿入できる
- clipboard画像pasteでファイル保存とLaTeX snippet挿入ができる
- `package.json` のconfigurationにLaTeX挿入関連settingsが復元されている
- 設定名・既定値が `v0.5.1` から意図せず変わっていない
- 必要に応じて `package.nls.ja.json` / `package.nls.json` に説明文が追加されている
- 追加済みテストが成功する

## 変更可能なファイル

- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `src/edit_provider/`
- `src/utils/`
- `src/extension.ts`
- `test/`
- `docs/tasks/0117-restore-latex-insertion-settings.md`

## 対象外

- LaTeX snippet仕様の再設計
- drag & drop対象をPDF以外へ広げること
- clipboard画像保存方式の大幅変更
- dependency追加

## 関連

- [0116: LaTeX挿入機能の失敗テストを追加する](0116-add-latex-insertion-settings-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- 必要なら `CI=true pnpm run test:vscode`
