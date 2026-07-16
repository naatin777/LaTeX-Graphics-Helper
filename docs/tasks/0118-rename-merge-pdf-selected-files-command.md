# タスク: mergePdf quick系command IDをselectedFilesへ寄せる

## Status

Done

## 目的

PDF結合のquick系command IDを、ページ選択ではなくファイル選択であることが分かる名前へ変更する。

現行実装に `latex-graphics-helper.mergePdf.selectedPages` が残っている場合は、`latex-graphics-helper.mergePdf.selectedFiles` へ寄せる。

## 背景

PDF結合quick系は、Explorerで選択したPDFファイルを結合する操作であり、ページを選択する操作ではない。

ページ単位の選択や順序変更は、Webview GUIの `latex-graphics-helper.mergePdf.configure` で扱う。

## 完了条件

- `latex-graphics-helper.mergePdf.selectedFiles` が登録されている
- 旧 `latex-graphics-helper.mergePdf.selectedPages` をv1向けに残すか削除するかを決める
  - 基本方針ではv1.0.0の破壊的変更として互換aliasを実装しない
- package manifest / NLS / tests / docs のcommand IDが整合している
- 既存の選択PDF結合テストが新command IDで通る

## 変更可能なファイル

- `src/`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `test/`
- `docs/specs/`
- `docs/tasks/0118-rename-merge-pdf-selected-files-command.md`

## 対象外

- mergePdf.configure GUIの実装
- ページ単位のmerge
- crop / splitの実装

## 関連

- [pdf-operation-command-modes.md](../specs/internal/pdf-operation-command-modes.md)
- [0114: 現行PDF結合コマンドの基本動作を実装する](0114-restore-basic-merge-pdf-command.md)

## 確認方法

- `pnpm run check`
- `CI=true pnpm run test -- --grep "PDF結合コマンド"`

## 実施内容

- `latex-graphics-helper.mergePdf.selectedPages` を `latex-graphics-helper.mergePdf.selectedFiles` へ変更した
- 旧 `latex-graphics-helper.mergePdf.selectedPages` は登録しない方針にした
- package manifest / NLS / VS Code command test / 関連docsを同期した
