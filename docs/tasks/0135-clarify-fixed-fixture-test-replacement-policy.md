# タスク: 固定fixtureによる既存テスト置換方針を明記する

## Status

Done

## 目的

固定fixtureを一時workspaceへコピーする方式を既存テストへの追加ではなく、同じ目的のプログラム生成・base64埋め込み方式からの置換として扱うことを明記する。

## 完了条件

- 固定fixture方式は同じ目的の旧方式テストを置き換えると記録する
- 置換前に既存の検証観点を移すと記録する
- 同じ目的の新旧テストを恒久的に並存させないと記録する
- 目的が異なる小さな単体テストや異常系は残せると区別する
- AI作業ルールからテスト方針を参照できる

## 変更可能なファイル

- `docs/specs/internal/test-policy.md`
- `.rulesync/rules/overview.md`
- RuleSyncが生成するAIルールファイル
- `docs/tasks/README.md`
- `docs/tasks/0135-clarify-fixed-fixture-test-replacement-policy.md`

## 対象外

- 既存テストコードの置換
- fixtureファイルの追加・削除
- テストランナーやCIの変更

## 関連

- [テスト方針](../specs/internal/test-policy.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](0126-design-real-fixture-and-visual-testing.md)

## 確認方法

- `pnpm run rulesync:generate`
- `pnpm run rulesync:check`
- `git diff --check`
