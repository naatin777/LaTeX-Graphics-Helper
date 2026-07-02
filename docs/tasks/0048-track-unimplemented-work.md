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
  - PDF → SVG
  - Draw.io → SVG
  - Mermaid → SVG
    - `.mmd`
    - `.mermaid`
- `latex-graphics-helper.convertToPng`
  - PDF → PNG
  - JPEG → PNG
  - WebP → PNG
  - AVIF → PNG
  - SVG → PNG
  - Mermaid → PNG
  - Draw.io → PNG
- `latex-graphics-helper.convertToJpeg`
  - PDF → JPEG
  - PNG → JPEG
  - WebP → JPEG
  - AVIF → JPEG
  - SVG → JPEG
  - Mermaid → JPEG
  - Draw.io → JPEG
- `latex-graphics-helper.convertToWebp`
  - PDF → WebP
  - PNG → WebP
  - JPEG → WebP
  - AVIF → WebP
  - SVG → WebP
  - Mermaid → WebP
  - Draw.io → WebP
- `latex-graphics-helper.convertToAvif`
  - PDF → AVIF
  - PNG → AVIF
  - JPEG → AVIF
  - WebP → AVIF
  - SVG → AVIF
  - Mermaid → AVIF
  - Draw.io → AVIF
- 共有`変換`サブメニュー配下の`PDF`
- 共有`変換`サブメニュー配下の`SVG`
- 共有`変換`サブメニュー配下の`PNG`
- 共有`変換`サブメニュー配下の`JPEG`
- 共有`変換`サブメニュー配下の`WebP`
- 共有`変換`サブメニュー配下の`AVIF`
- SVG→PDFの変換方式設定
  - `puppeteer`
  - `rsvg-convert`
- Safe Mode
- Undo last conversion
- progress / cancellation の基本
- workspace内作業領域 `.latex-graphics-helper/` を使った安全な反映

## 未実装・保留

2026-07-02時点で、出力形式基準コマンドの主要な変換組み合わせは実装済み。

今後の保留事項:

- 画像を1つのPDFへ結合する機能
- PDFページを1つの画像へ結合する機能
- 出力形式基準の新しい`outputPath.convertTo*`設定への移行
- Mermaid theme / look / backgroundColor の設定化
- editable Draw.io画像で、元ファイル名・元拡張子そのものをoutputPathテンプレートで参照する変数追加

### ドキュメント・テスト管理

- `docs/test-matrix.md`が現状実装とずれている可能性がある
  - 0088で更新する
- READMEが最新実装とずれている可能性がある
  - 0088で更新する

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
