# タスク: Check workflowとpackage checkの差分を整理する

## Status

Done

## 目的

GitHub Actionsの `Check` workflowと `package.json` の `check` scriptの差分が意図的かどうかを確認し、CIで確認すべき項目を整理する。

## 背景

0172のCI baseline測定で、現在の `Check` workflowは `rulesync:check`、`lint`、`typecheck` を個別実行している一方、`package.json` の `check` は `lint`、`format`、`typecheck`、`typecheck:webview` を含むことが分かった。

## 完了条件

- `Check` workflowと `package.json` の `check` / `check:all` の差分を表にしている
- `format` と `typecheck:webview` をCIで実行しない理由があるか確認している
- 変更が必要な場合、workflow変更タスクを別に切っている
- このタスクではworkflowを変更していない

## 変更可能なファイル

- `docs/tasks/0177-align-check-workflow-with-package-check.md`
- `docs/tasks/README.md`

## 対象外

- workflow変更
- package script変更
- lint / format設定変更

## 関連

- [0172: CI scope設計の現状baselineを測定する](0172-measure-ci-scope-baseline.md)

## 確認方法

- `.github/workflows/check.yml` と `package.json` を読む
- `git diff --check`

## 確認結果

### 実行単位の差分

| 対象                          | 実行内容                                                            | 役割                                                     |
| ----------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| `package.json` の `check`     | `lint`、`format`、`typecheck`、`typecheck:webview`                  | アプリ本体とWebviewを含むローカル静的チェック            |
| `package.json` の `check:all` | `check`、`check:test`（`typecheck:test`、`typecheck:webview:test`） | ローカルで実行する全静的チェック                         |
| `.github/workflows/check.yml` | `rulesync:check`、`lint`、`typecheck`                               | RuleSync生成物と拡張機能本体だけのCIチェック             |
| `.github/workflows/test.yml`  | `pnpm run test`、Electron E2E                                       | compile、VS Code integration test、Electron Webview test |

### 判断

`format` と `typecheck:webview` を `Check` workflowから除外する、という理由は現在のリポジトリ内に記録されていなかった。特に`package.json`の`check`がプロジェクトの標準静的チェックとして定義され、WebviewのTypeScriptも実装対象に含まれているため、現状はCIの確認漏れと判断する。

一方、`check:all`をそのまま`Check` workflowで実行する必要はない。`check:all`に含まれるtest用typecheckは、VS Code test jobの`test:vscode`が`build:test`を通じて実行するため、Check workflowでは`check`までを実行し、実行テストはTest workflowに任せる方が責務を分けやすい。

RuleSync検証は`package.json`の`check`には含まれないため、`rulesync:check`を先に独立実行する現行構成は維持する。

この判断によるworkflow変更は別タスクへ分離した。

- [0178: Check workflowでpackage checkを実行する](0178-run-package-check-in-ci.md)

## 実施結果

- `Check` workflow、`check`、`check:all`の実行内容を比較表にした
- `format` と `typecheck:webview`をCIで実行しない根拠がないことを確認した
- `check:all`全体ではなく`check`をworkflowへ接続する方針を決めた
- workflow変更を[0178](0178-run-package-check-in-ci.md)へ分離した
- このタスクではworkflow、package script、lint / format設定を変更していない
