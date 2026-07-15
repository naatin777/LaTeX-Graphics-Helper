# タスク: CI scope classifierを実装する

## Status

Done

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

## 実装

- `.github/scripts/detect-ci-scope.mjs`をGitHub Actions用のentry pointとした
- pureな分類境界、Git差分取得、Actions output生成を責務別のmoduleへ分けた
- classifierの入力は`unknown`として扱い、malformed input、hostile object、diff取得失敗、unknown pathではthrowせずfull scopeへ倒す
- renameは変更前後のpathを分類し、`git diff --name-status -z`で空白・Unicode・改行を含むpathを分離したまま読み取る
- 判定結果をscalar flag、対象OSのJSON配列、decision全体のJSONとして`GITHUB_OUTPUT`へ出力する
- logには固定されたscopeとreasonだけを出し、変更pathは含めない

## 実施結果

- classifier仕様テストは34件成功した
- unknownな`src/**`はextension coreと推測せずfull scopeへ倒し、既知core pathだけを明示した
- `README*.md`の空白・Unicode名と、NUL区切りrename statusの正常・異常系を回帰テストへ追加した
- 過去のdocs-only commit範囲を使ったCLI smoke testで`scope=docs`と重いjobの無効化flagを出力できた
- `pnpm run check`は成功した
- `pnpm run check:test`は成功した
- `pnpm run test`は実VS Code上で208件成功し、Extension Hostも正常終了した
- 新規JavaScript 3fileは`oxfmt --check`と`node --check`に成功した
- `git diff --check`は成功した
- workflowへの接続は0175へ残した
