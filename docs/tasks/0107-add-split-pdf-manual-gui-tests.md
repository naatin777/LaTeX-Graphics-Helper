# タスク: splitPdf.manual GUIの失敗テストを追加する

## Status

Todo

## 目的

`splitPdf.manual` の実装前に、ページ選択GUIとHost連携の主要な振る舞いを失敗テストとして固定する。

## 完了条件

- WebviewがPDFページ情報を受け取って表示することをテストする
- ユーザーが選択したページ情報をHostへ送ることをテストする
- Hostが選択ページに基づいて分割処理を開始することをテストする
- Safe Mode / Undo / cancellation のうち、この段階で固定する範囲を明記する
- 実装未完了を理由に追加テストが失敗することを確認する

## 変更可能なファイル

- `test/`
- `test/playwright/`
- `webview/apps/`
- `docs/tasks/0107-add-split-pdf-manual-gui-tests.md`

## 対象外

- `src/` の実装変更
- Webview実装変更
- crop / merge GUIのテスト追加

## 関連

- [0106: splitPdf.manual GUIの仕様を決める](0106-design-split-pdf-manual-gui.md)

## 確認方法

- `pnpm run check:test`
- `pnpm run test:playwright`
- 必要なら `CI=true pnpm run test:vscode`
