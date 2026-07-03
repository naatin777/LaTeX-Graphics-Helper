# タスク: mergePdf GUIの失敗テストを追加する

## Status

Todo

## 目的

`mergePdf.configure` の実装前に、PDF結合GUIとHost連携の主要な振る舞いを失敗テストとして固定する。

## 完了条件

- GUIに必要なPDF情報が表示されることをテストする
- ユーザーの選択・順序情報がHostへ送られることをテストする
- Hostが選択内容に基づいてmerge処理を開始することをテストする
- Safe Mode / Undo / cancellation のうち、この段階で固定する範囲を明記する
- 実装未完了を理由に追加テストが失敗することを確認する

## 変更可能なファイル

- `test/`
- `test/playwright/`
- `webview/apps/merge_pdf/`
- `docs/tasks/0110-add-merge-pdf-gui-tests.md`

## 対象外

- `src/` の実装変更
- Webview実装変更
- crop / split GUIのテスト追加

## 関連

- [0109: mergePdf GUIの仕様を決める](0109-design-merge-pdf-gui.md)

## 確認方法

- `pnpm run check:test`
- `pnpm run test:playwright`
- 必要なら `CI=true pnpm run test:vscode`
