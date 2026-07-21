# 複数画像を1つのPDFへ結合する仕様

## 目的

複数の画像入力を1つのPDFファイルへ結合する変換コマンドを提供する。既存の `convertToPdf`（入力ごとに個別PDF）とは異なり、全入力を単一のPDFにまとめる。

## コマンド

| Command ID | 表示名 | 出力形式 |
|-----------|--------|---------|
| `latex-graphics-helper.convertImagesToSinglePdf` | 画像を1つのPDFに結合 | PDF |

## 対象入力形式

- PNG、JPEG、WebP、AVIF、GIF、TIFF（ラスター画像）
- SVG
- EPS

Mermaid、Draw.io、ネイティブPDFは対象外。Draw.ioは既に `convertDrawioToPdfDirectly` で全ページを1PDFにする専用コマンドがある。

## 入力と順序

複数ファイルを選択可能。1ファイルだけ選択した場合も許容する（単一画像→1ページPDF）。

画像の順序は Explorer での選択順（VS Code の `uris` 配列順）とする。ユーザーが Ctrl+クリックで選んだ順序をそのまま使う。

## 出力パス

複数ファイル選択時（出力ファイルが1つになる場合）は保存ダイアログを表示し、ユーザーに出力先を指定させる。

単一ファイル選択時は既存の outputPath テンプレート `${fileDirname}/${fileBasenameNoExtension}.pdf` を使用する。

## ページサイズ

各入力画像の pixel 幅・高さを point 単位のページサイズとして扱う。ページごとに異なるサイズを許容する。

- ラスター画像: `sharp` の metadata から幅・高さを取得し、pixel = point でページサイズとする
- SVG: `sharp` の metadata から幅・高さを取得（既存の `readSvgSize` を再利用）
- EPS: Ghostscript で生成した中間PDFの MediaBox からサイズを取得

## 内部パイプライン

```
画像1 ─→ 既存の画像→PDF処理 ─→ 中間PDF1 ┐
画像2 ─→ 既存の画像→PDF処理 ─→ 中間PDF2 ┤─ pdf-lib copyPages → 結合PDF
画像3 ─→ 既存の画像→PDF処理 ─→ 中間PDF3 ┘
```

1. 各入力画像を既存の経路で単ページPDFへ変換する
   - ラスター画像: `writeRasterImageAsPdf`（sharp + pdf-lib）
   - SVG: `writeSvgAsPdf`（rsvg-convert または Puppeteer）
   - EPS: `writeEpsAsPdf`（Ghostscript pdfwrite → pdf-lib copy）
2. 生成された中間PDFを pdf-lib の `copyPages` で1つの `PDFDocument` にマージする
3. 結合PDFを staging へ保存し、commit する

中間PDFは staging directory 内で管理し、ユーザーに見せない。commit 後に staging cleanup で削除する。

## エラー処理

1件でも入力の変換に失敗した場合、結合PDFを出力しない。既存の batch transaction モデルに従う。

全画像が正常に変換され、結合も成功した場合のみ commit する。

## Safe Mode、Undo、Progress、Cancellation

既存の出力形式基準コマンドと同じ batch transaction モデルを使用する。

- **Safe Mode**: 出力先に既存ファイルがある場合、競合判断を1回だけ行う
- **Undo**: batch 全体を1回分の Undo として記録する
- **Progress**: `vscode.window.withProgress` で「N件中M件を処理中」と表示する
- **Cancellation**: `AbortSignal` を全処理に伝播し、途中停止時は出力しない

## 設定

outputPath 設定は `outputPath.convertImagesToSinglePdf` で提供する。未設定の場合は保存ダイアログ（複数選択時）またはデフォルトテンプレート（単一選択時）を使用する。

## 対象外

- 画像の並び替えUI
- 結合方向の指定（縦結合・横結合・grid など、PDFのページ結合なので不要）
- 画像間への空白ページ挿入
- Mermaid、Draw.io、PDFの入力

## テスト計画

- 全対象入力形式（PNG, JPEG, WebP, AVIF, GIF, TIFF, SVG, EPS）の単一→1ページPDF
- 複数形式混在選択の結合
- 1件の変換失敗時に出力しないことの確認
- Safe Mode 競合判断の確認
- Undo の確認
- 単一選択時に保存ダイアログが出ないことの確認
- 複数選択時に保存ダイアログが出ることの確認

## 関連

- [出力形式基準の変換仕様](output-format-conversion.md)
- [Safe Mode仕様](safe-mode.md)
- [EPS変換の内部契約](../internal/eps-conversion.md)
- [変換入力preflightの内部契約](../internal/input-preflight.md)
- [0096: 複数画像を1つのPDFへ結合する仕様を決める](../../tasks/0096-design-combine-images-to-single-pdf.md)
