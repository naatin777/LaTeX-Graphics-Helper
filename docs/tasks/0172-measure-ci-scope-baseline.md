# タスク: CI scope設計の現状baselineを測定する

## Status

Todo

## 目的

変更影響CI scopeを導入する前に、現状のGitHub Actionsでどこに時間がかかっているかを測定し、以後の改善効果を比較できるbaselineを作る。

## 完了条件

- 直近のfull runを最低3件確認している
- 直近のdocs-only runがあれば確認している
- workflow / job / 主要stepごとの時間を記録している
- setup時間とtest時間を分けて概算している
- scope改善で短縮できそうな箇所と、短縮できなさそうな箇所を分けている
- 修正が必要な場合は別タスク化している

## 変更可能なファイル

- `docs/tasks/0172-measure-ci-scope-baseline.md`
- 必要な `docs/research/`

## 対象外

- workflow、script、package scriptの変更
- test分割
- cacheやparallel stepsの導入

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- GitHub Actionsのrun logまたは `gh run view` で測定する
- `git diff --check`
