# タスク: テスト名を全体的に日本語化する

## Status

Done

## 目的

VS Code testの実行結果を見たときに、主要なテストの意味を日本語で把握しやすくする。

## 完了条件

- `test/package_manifest.test.ts`以外の主要test fileも対象にする
- suite名とtest名を日本語化する
- assertion、期待値、実装は変更しない
- テストケースの追加・削除はしない

## 変更可能なファイル

- `docs/tasks/0059-localize-test-names-broadly.md`
- `docs/tasks/README.md`
- `test/*.test.ts`

## 対象外

- 実装変更
- assertionの意味変更
- テストケースの追加・削除
- テスト構造の大規模整理

## 確認方法

- `pnpm run check`
- `pnpm run test`
