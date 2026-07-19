# PROJECT_STATE.md

このファイルは、プロジェクトの現在地を見失わないためのメモです。

## Goal

LaTeX Graphics Helper は、VS Code 上で PDF・画像・Draw.io・LaTeX への挿入作業を扱いやすくする拡張機能です。

## Current priority

- Extension Hostをpre-package testの唯一のruntimeとして維持する
- 次の作業は `docs/tasks/README.md` で管理する

## Implemented

- PDF crop
- PDF split
- PDF merge
- PDF to PNG/JPEG/WebP/AVIF/SVG conversion
- PNG/JPEG/WebP/AVIF/SVG to PDF conversion
- Draw.io to PDF conversion
- Native Draw.io PDF conversion by page or as one PDF
- Puppeteer Chrome/Firefox selection for SVG conversion
- Insert LaTeX code from PDF
- Insert LaTeX code from clipboard image

## In progress

- なし

## Non-goals

Task 0201完了後も次を行わない。

- production codeのリファクタリング
- test directoryの全面移動
- test runnerの移行・比較
- required statusやbranch protectionの変更
- Playwright Electronへの全面置換
- 新しいユーザー機能
- Coding Houtei相当のrepository内実装
- inspired-mino-design-skills suiteの全面導入

## Important Decisions

- 技術案、runner名、directory名をproblemや目的として扱わない。
- 観測、解釈、仮説、unknown、contradictionを分離してから判断する。
- test runnerは、runner統一ではなく、守るcontractとoracleから選ぶ。
- pre-package testはすべて`vscode-test`で実行し、Node専用runnerやExtension Hostからの除外を持たない。
- Extension Host testはLinux、macOS、Windowsで恒久的に維持し、required statusは設定しない。
- Browser Playwrightは廃止し、実VS Codeを必要とする配布物E2Eはpackage済みVSIXのElectron Playwrightで確認する。
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
