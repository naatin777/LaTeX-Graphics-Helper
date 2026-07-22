# タスク: sharp更新のDependabot対応を再評価する

## Status

Done — Superseded

このtaskが想定した「sharp更新のDependabot PRが再作成された場合の評価」は、更新が既に`next/v1`へ反映されたため終了した。独立したDependabot PRの再openや追加のmaintainer判断は不要である。

## 判定とEvidence

- task作成時の対象は`sharp: ^0.34.5`だった。
- commit `2528145`（2026-07-17）で`sharp`は`^0.35.3`へ更新され、現在の`package.json`と`package-lock.json`も`^0.35.3`である。
- current `next/v1` head `12af6da`（PR #371）について、Linux / macOS / WindowsのExtension Host checksとpackaged Electron checksがsuccessしたEvidenceがある。
- local `npm test`は320 passing。過去のlocal EPS failureは、test executable pathの不具合であり、修正済みである。

したがって、更新後のOS別CI観点とlocal Extension Host testはEvidenceで確認済みであり、条件付きの再評価taskを継続する理由はない。packaged Electronの検証入口は、VSIXを指定した`LGH_VSIX_PATH=/absolute/path/to/file.vsix npm run test:playwright:vsix`である。このbranchではlocal packaged Electron testを実行していない。

## 目的

過去にCI失敗履歴があったsharp更新について、Dependabot PRが再作成された場合にどう扱うか判断できるようにする。

## 完了条件

- 対象のsharp更新内容を確認する
- 画像/PDF変換テストへの影響を確認する
- Windows / macOS / Linux CIで見るべき観点を整理する
- 更新する場合の検証コマンドを明確にする

## 変更可能なファイル

- `docs/tasks/0101-evaluate-sharp-dependabot-update.md`
- 必要なら `docs/research/`
- 必要なら `docs/tasks/README.md`

## 対象外

- Dependabot PRの再open
- dependency更新
- 実装変更

## 関連

- [0048: 未実装・保留事項を整理する](0048-track-unimplemented-work.md)

## 確認方法

- 更新可否を判断するための確認観点が記録されていることを確認する
