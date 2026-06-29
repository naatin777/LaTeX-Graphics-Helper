# タスク: 未実装・保留事項を整理する

## Status

Done

## 目的

現在の実装状態と、仕様・設定・タスク上で未実装のものを整理する。

AIが「仕様には書いてあるが実装済みではないもの」を実装済みと誤認しないようにする。

## 背景

出力形式基準の変換コマンドは段階的に実装している。

現時点では`latex-graphics-helper.convertToPdf`は実装済みだが、他の出力形式基準コマンドはまだ実装されていない。

また、Mermaid変換は段階的に実装している。

## 現在実装済み

- `latex-graphics-helper.convertToPdf`
  - PNG → PDF
  - JPEG → PDF
  - WebP → PDF
  - AVIF → PDF
  - SVG → PDF
  - Mermaid → PDF
    - `.mmd`
    - `.mermaid`
- `latex-graphics-helper.convertToSvg`
  - Mermaid → SVG
    - `.mmd`
    - `.mermaid`
- 共有`変換`サブメニュー配下の`PDF`
- 共有`変換`サブメニュー配下の`SVG`
- SVG→PDFの変換方式設定
  - `puppeteer`
  - `rsvg-convert`
- Safe Mode
- Undo last conversion
- progress / cancellation の基本
- workspace内作業領域 `.latex-graphics-helper/` を使った安全な反映

## 未実装

### 出力形式基準コマンド

以下の公開コマンドは仕様上の方針としては存在するが、まだ実装していない。

- `latex-graphics-helper.convertToPng`
- `latex-graphics-helper.convertToJpeg`
- `latex-graphics-helper.convertToWebp`
- `latex-graphics-helper.convertToAvif`

### 変換組み合わせ

以下はまだ統合コマンドとして実装していない。

- PDF → PNG/JPEG/WebP/AVIF/SVG
- SVG → PNG/JPEG/WebP/AVIF
- PNG/JPEG/WebP/AVIF → PNG/JPEG/WebP/AVIF
- Draw.io → PDF/PNG/JPEG/WebP/AVIF/SVG の出力形式基準コマンド統合

### Mermaid

Mermaid → SVGは実装済み。

以下はまだ未実装。

- `.mmd` → PNG/JPEG/WebP/AVIF
- `.mermaid` → PNG/JPEG/WebP/AVIF

Mermaid専用の公開コマンドは作らない。出力形式基準コマンドへ入力形式として追加する。

Mermaid → PNG/JPEG/WebP/AVIFは、それぞれ`convertToPng`、`convertToJpeg`、`convertToWebp`、`convertToAvif`の実装に依存する。

仕様は`docs/tasks/0047-design-mermaid-file-conversion.md`で決定済み。

### ドキュメント・テスト管理

- `docs/test-matrix.md`が現状実装とずれている可能性がある
  - `convertToPdf`の対応入力が古い可能性がある
- READMEが最新実装とずれている可能性がある
  - 画像からPDFへの対応形式
  - SVG→PDFのバックエンド説明
  - 出力形式基準コマンドの説明

## Dependabotの扱い

Dependabot PRは一旦何もしない。

- #252 はmainに実質反映済みだったためclose済み
- #254 はsharp更新でCI失敗履歴があったためclose済み

Dependabot PRは再作成される可能性があるが、その時点で改めて判断する。

sharp更新は画像/PDF変換の中核依存に関係するため、再度扱う場合は別タスクで検証する。

## 完了条件

- 未実装一覧を確認し、認識違いがあれば修正する
- 次に着手するタスクを1つ選ぶ
- 必要なら未実装項目を個別タスクへ分割する

## 変更可能なファイル

- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/tasks/README.md`
- 必要なら `docs/test-matrix.md`
- 必要なら `README.ja.md`
- 必要なら `README.md`

## 対象外

- 未実装機能の実装
- dependency更新
- Dependabot PRの再open
- sharp更新の検証

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0047-design-mermaid-file-conversion.md`
- `docs/test-matrix.md`

## 確認方法

- ユーザーが未実装一覧を確認する
