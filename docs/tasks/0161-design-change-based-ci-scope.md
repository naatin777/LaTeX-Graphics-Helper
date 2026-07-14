# タスク: 変更影響に応じたCI scopeを設計する

## Status

Todo

## 目的

変更内容に関係するtestとOSだけを実行し、必要な確認をskipせずGitHub Actionsの準備・実行時間を減らす設計を決める。

## 決めること

- docs、Webview、core extension、外部CLI変換、CI・dependency変更の分類
- 各分類で必要なcheck、vscode-test、browser Playwright、Electron E2E、対象OS
- 未知のfileや複数分類を安全側で全実行にする方法
- VS Code testをcore / conversionへ分ける必要性
- path判定、test選択、workflow条件の責務
- 現在時間と変更後時間の測定方法

## 完了条件

- 変更分類と実行するCIの対応表がある
- required checkをPendingにしない構成を決めている
- 外部toolを必要なjobだけで準備する設計になっている
- 誤ったskipを検出・回避する条件がある
- 実装を小さな実測タスクへ分けている
- workflow、script、testをこのタスクで変更していない

## 変更可能なファイル

- `docs/tasks/0161-design-change-based-ci-scope.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`
- 必要な`docs/research/`

## 対象外

- GitHub Actions、script、package scriptの変更
- test fileの分割
- parallel stepsとshardの再導入
- dependency追加

## 関連

- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)
- [0151: CI環境変数のローカル・CI運用を整理する](0151-document-ci-env-policy.md)

## 確認方法

- 現在のworkflowとtest構成を対応表へ当てはめる
- 未知の変更、複数分類、docs-onlyの例で判定を確認する
- `git diff --check`
