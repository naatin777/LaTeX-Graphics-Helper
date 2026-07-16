# PROJECT_STATE.md

このファイルは、プロジェクトの現在地を見失わないためのメモです。

## Goal

LaTeX Graphics Helper は、VS Code 上で PDF・画像・Draw.io・LaTeX への挿入作業を扱いやすくする拡張機能です。

## Current priority

- Task 0201で確定したNode / Extension Hostのtest ownershipを維持する
- 次の作業は `docs/tasks/README.md` で管理する

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

- なし

## Non-goals

Task 0201完了後も次を行わない。

- production codeのリファクタリング
- test directoryの全面移動
- tested subsetのNode対象拡大
- Node MochaからVitestへの移行・比較
- required statusやbranch protectionの変更
- Browser Playwrightの即時廃止
- Playwright Electronへの全面置換
- 新しいユーザー機能
- Coding Houtei相当のrepository内実装
- inspired-mino-design-skills suiteの全面導入

## Important Decisions

- 技術案、runner名、directory名をproblemや目的として扱わない。
- 観測、解釈、仮説、unknown、contradictionを分離してから判断する。
- test runnerは、runner統一ではなく、守るcontractとoracleから選ぶ。
- `source_format`、`crop_pdf_protocol`、`resolve_output_path`、`file_content_hash`、`safe_mode`の5 filesはNode 22 + Mochaで実行する。
- Node CIはLinux、macOS、Windowsで恒久的に維持し、required statusは設定しない。
- 選定5 filesはExtension Hostから除外し、Host固有oracleを必要とするtestだけをHostで実行する。
- BrowserとVS Code Electronの既存境界は変更しない。
- required platform、quality priority、不可逆な変更はmaintainerが決める。
- Selection Gateが決まるまで、大規模なproduction architecture変更を開始しない。
- 作業中は `docs/tasks/README.md` からリンクされた1つのtaskに限定する。作業がない場合はCurrent Taskを空にする。
- 気になるリファクタは、すぐ直さず `docs/refactor-backlog.md` に書く。
- 採用した永続判断は `docs/adr/` に記録する。未決案をADRで確定扱いしない。
- READMEは日本語で正確に書いてから英語化してよい。
- 英語で書くもの・日本語で書くものは `docs/adr/0011-define-language-policy-for-project-artifacts.md` に従う。
- AIにはコードを書かせるが、価値判断と最終承認は渡さない。

## Tasks

See `docs/tasks/README.md`.
