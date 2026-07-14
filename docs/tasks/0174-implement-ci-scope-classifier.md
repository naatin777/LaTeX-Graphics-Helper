# タスク: CI scope classifierを実装する

## Status

Todo

## 目的

0173で固定した仕様に従い、変更file一覧をCI scopeへ分類するscriptを実装する。

## 完了条件

- classifier scriptを追加している
- classifierはworkflow YAMLへ判定logicを分散させていない
- docs-only、Webview、conversion、package、CI、unknown、複数scopeを判定できる
- 判定不能時はfull scopeを返す
- GitHub Actions outputで後続jobが参照できる形式になっている
- 判定理由をlogへ出している
- 0173のテストが通っている

## 変更可能なファイル

- `.github/scripts/`
- classifier test
- 必要なpackage script
- `docs/tasks/0174-implement-ci-scope-classifier.md`
- `docs/tasks/README.md`

## 対象外

- workflowへの接続
- VS Code test分割
- 外部tool install条件の変更

## 関連

- [0173: CI scope classifierの仕様テストを追加する](0173-add-ci-scope-classifier-tests.md)

## 確認方法

- classifier testを実行する
- `pnpm run check`
- `git diff --check`
