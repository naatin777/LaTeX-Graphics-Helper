# PROJECT_STATE.md

このファイルは、プロジェクトの現在地を見失わないためのメモです。

## Goal

LaTeX Graphics Helper は、VS Code 上で PDF・画像・Draw.io・LaTeX への挿入作業を扱いやすくする拡張機能です。

## Current Priority

既存の主要機能を、把握できる状態で安定させる。

今は、完璧な設計・大規模なリファクタ・高度なCI/CDよりも、動く範囲を小さく保ち、完成に近づけることを優先する。

## Implemented

- PDF crop
- PDF split
- PDF merge
- PDF to PNG/JPEG/SVG conversion
- PNG/JPEG/SVG to PDF conversion
- Draw.io to PDF conversion
- Insert LaTeX code from PDF
- Insert LaTeX code from clipboard image

## In Progress

- なし。現在のタスクは `docs/tasks/README.md` で管理する。

## Not Doing Now

- 大規模なアーキテクチャ変更
- ディレクトリ構成の全面整理
- 高度なCI/CD
- カバレッジ目標の設定
- 好みレベルのリファクタリング
- 新しい依存の追加
- 仕様が固まっていない機能の作り込み

## Important Decisions

- 作業は `docs/tasks/README.md` からリンクされた1つのタスクに限定する。
- 気になるリファクタは、すぐ直さず `docs/refactor-backlog.md` に書く。
- 設計判断に迷ったら、`docs/adr/` に記録してから進める。
- READMEは日本語で正確に書いてから英語化してよい。
- AIにはコードを書かせるが、判断権は渡さない。

## Tasks

See `docs/tasks/README.md`.
