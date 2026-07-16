# PROJECT_STATE.md

このファイルは、プロジェクトの現在地を見失わないためのメモです。

## Goal

LaTeX Graphics Helper は、VS Code 上で PDF・画像・Draw.io・LaTeX への挿入作業を扱いやすくする拡張機能です。

## Current priority

- v1で保証するcapability、仕様、test Evidence、toolingのbaseline監査
- Browser Playwright、VS Code Electron、Extension Host、Node / Vitestの役割整理
- test directory、package script、CI、Oxlint、project Skillの前提確認

cross-platform VSIX verificationとREADME・NLS・設定同期は、foundation auditで必要Evidenceと作業順を整理した後に再開する。

## Implemented

- PDF crop
- PDF split
- PDF merge
- PDF to PNG/JPEG/WebP/AVIF/SVG conversion
- PNG/JPEG/WebP/AVIF/SVG to PDF conversion
- Draw.io to PDF conversion
- Insert LaTeX code from PDF
- Insert LaTeX code from clipboard image

## In progress

- [0198: v1開発基盤の前提を監査する](docs/tasks/0198-audit-v1-development-foundation.md)

## Non-goals

foundation audit中は次を行わない。

- production codeのリファクタリング
- test directoryの全面移動
- Browser Playwrightの即時廃止
- Playwright Electronへの全面置換
- Oxlint rule、dependency、CIの即時変更
- 新しいユーザー機能
- Coding Houtei相当のrepository内実装
- inspired-mino-design-skills suiteの全面導入

## Important Decisions

- 技術案、runner名、directory名をproblemや目的として扱わない。
- 観測、解釈、仮説、unknown、contradictionを分離してから判断する。
- test runnerは、runner統一ではなく、守るcontractとoracleから選ぶ。
- required platform、quality priority、不可逆な変更はmaintainerが決める。
- foundation auditが完了するまで、大規模なproduction architecture変更を開始しない。
- 作業中は `docs/tasks/README.md` からリンクされた1つのtaskに限定する。作業がない場合はCurrent Taskを空にする。
- 気になるリファクタは、すぐ直さず `docs/refactor-backlog.md` に書く。
- 採用した永続判断は `docs/adr/` に記録する。未決案をADRで確定扱いしない。
- READMEは日本語で正確に書いてから英語化してよい。
- 英語で書くもの・日本語で書くものは `docs/adr/0011-define-language-policy-for-project-artifacts.md` に従う。
- AIにはコードを書かせるが、価値判断と最終承認は渡さない。

## Tasks

See `docs/tasks/README.md`.
