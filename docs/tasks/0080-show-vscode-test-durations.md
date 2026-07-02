# タスク: VS Code integration testで各テストの所要時間を表示する

## Status

Done

## 目的

`test:vscode` の実行時間が長くなっているため、どのtest caseが重いかCIログから分かるようにする。

## 完了条件

- VS Code integration testで各test caseの所要時間が表示される
- Playwright側は既存設定で各test caseの所要時間が表示されることを確認する
- テスト内容や実行対象は変更しない

## 変更可能なファイル

- `.vscode-test.mjs`
- `docs/tasks/README.md`
- `docs/tasks/0080-show-vscode-test-durations.md`

## 対象外

- test suiteの分割
- CI workflowの統合・cache変更
- 重いtest caseの削減
- Playwright設定の変更

## 確認方法

- `CI=true pnpm run check`
- `CI=true pnpm run test:vscode`
