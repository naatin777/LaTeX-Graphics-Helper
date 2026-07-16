# PROJECT_STATE.md

このファイルは、プロジェクトの現在地を見失わないためのメモです。

## Goal

LaTeX Graphics Helper は、VS Code 上で PDF・画像・Draw.io・LaTeX への挿入作業を扱いやすくする拡張機能です。

## Current priority

- v1安全性修正後の構造簡素化
- repository内AIハーネスの縮小
- command/operation依存の明確化
- release作業は簡素化完了後に再開

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

- なし。0194はBlocked、0195は未着手。

## Non-goals

- 大規模なアーキテクチャ変更
- ディレクトリ構成の全面整理
- 高度なCI/CD
- カバレッジ目標の設定
- 好みレベルのリファクタリング
- 新しい依存の追加
- 仕様が固まっていない機能の作り込み
- 新しいユーザー機能
- Coding Houtei相当のrepository内実装

## Important Decisions

- 作業中は `docs/tasks/README.md` からリンクされた1つのtaskに限定する。作業がない場合はCurrent Taskを空にする。
- 気になるリファクタは、すぐ直さず `docs/refactor-backlog.md` に書く。
- 設計判断に迷ったら、`docs/adr/` に記録してから進める。
- READMEは日本語で正確に書いてから英語化してよい。
- 英語で書くもの・日本語で書くものは `docs/adr/0011-define-language-policy-for-project-artifacts.md` に従う。
- AIにはコードを書かせるが、判断権は渡さない。

## Tasks

See `docs/tasks/README.md`.
