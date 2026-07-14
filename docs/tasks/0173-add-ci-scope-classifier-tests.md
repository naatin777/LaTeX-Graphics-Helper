# タスク: CI scope classifierの仕様テストを追加する

## Status

Todo

## 目的

変更file一覧からCI scopeを決めるclassifierについて、実装前にdocs-only、Webview、conversion、unknown、複数scopeの判定仕様をテストで固定する。

## 完了条件

- classifierの入力と出力contractを決めている
- docs-onlyが重いtestを要求しないことをテストしている
- Webview変更がElectron E2Eを要求することをテストしている
- conversion / external CLI変更が3 OSのconversion testを要求することをテストしている
- package / lockfile / CI変更がfull scopeになることをテストしている
- unknown file、空の変更file list、diff取得失敗がfull scopeになることをテストしている
- 初期実装では複数の非docs scopeがfull scopeになることをテストしている
- docsと単一非docs scopeの組み合わせが、非docs側のscopeになることをテストしている
- PR、push、初回push、rename、削除、diff取得失敗の扱いをテストしている

## 変更可能なファイル

- classifier仕様テスト
- 必要なtest fixture
- `docs/tasks/0173-add-ci-scope-classifier-tests.md`
- `docs/tasks/README.md`

## 対象外

- classifier本体の実装
- workflow接続
- test分割

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- 追加したclassifier仕様テストを実行する
- `pnpm run check`
- `git diff --check`
