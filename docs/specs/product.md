# Product Spec

## Product Name

LaTeX Graphics Helper

## Purpose

VS Code 上で、LaTeX 文書作成時に必要になる PDF・画像・Draw.io 関連の作業を簡単に行えるようにする。

## Target Users

- LaTeX を使って文書を書く人
- PDF や画像を LaTeX に挿入する人
- Draw.io 図を PDF 化して LaTeX に使う人
- VS Code 内でファイル変換作業を完結させたい人

## Core Value

外部ツールや手作業を減らし、VS Code から直感的に PDF・画像・LaTeX 挿入作業を行えること。

## Current Features

- PDF の crop
- PDF の split
- PDF の merge
- PDF から PNG/JPEG/SVG への変換
- PNG/JPEG/SVG から PDF への変換
- Draw.io から PDF への変換
- PDF ファイルのドラッグ&ドロップによる LaTeX コード生成
- クリップボード画像の貼り付けによる LaTeX コード生成

## Non Goals for Now

- 完璧なGUI
- 高度な画像編集
- PDFビューア機能
- 全OSでの完全な外部ツール自動セットアップ
- 大規模な設定画面
- 過剰な抽象化

## Quality Policy

- ユーザーが使う主要フローを壊さない。
- 失敗時に原因が分かるエラーを出す。
- 依存する外部ツールがない場合は、分かりやすく通知する。
- 内部設計の綺麗さより、動作の分かりやすさと保守しやすさを優先する。
