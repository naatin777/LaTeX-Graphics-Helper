# タスク: 追加画像形式とEPS対応の仕様を決める

## Status

Todo

## 目的

現在対応しているPNG、JPEG、WebP、AVIF、SVGに加え、sharpが安定して扱える画像形式とGhostscriptで扱うEPSを、既存の出力形式基準commandへ安全に追加する仕様を決める。

## 完了条件

- 入力形式と出力形式を分けて対応範囲を決める
- sharp同梱のprebuilt libvipsで3 OS共通利用できる形式だけをdefault対応候補にする
- `sharp.format`をmacOS、Windows、Linux CIで確認する方法を決める
- GIF animationとmulti-page TIFFのpage / frame semanticsを決める
- GIF・TIFFからPDFへ変換するとき、1ファイルへまとめるかpageごとに出力するか決める
- GIF・TIFFからraster形式へ変換するとき、先頭pageだけか全pageか決める
- HEIF / HEICをdefault対応、条件付き対応、対象外のどれにするか決める
- EPSをGhostscriptでPDFへ変換し、他形式へは既存PDF変換経路を使う方針を検証する
- EPSのBoundingBox、単一page制約、font、color、vector保持を確認する
- EPS / PostScript入力のsecurityとpreflight方針を決める
- JP2、JPEG XL、BMP、ICOなど追加候補の採否を記録する
- context menu、複数選択、Safe Mode、Undo、progress、cancellation、outputPathの扱いを既存形式と揃える
- 形式ごとの実fixtureと変換後の画像比較テスト方針を決める
- dependencyまたは外部tool追加が必要な場合は、実装前にADRへ記録する

## 初期候補

### default対応を優先して検討

- GIF input
- TIFF input
- GIF output
- TIFF output
- EPS input

### 条件付き対応を検討

- HEIF / HEIC
- JP2
- JPEG XL

### 追加理由があるまで保留

- libvips V format
- DZI
- raw pixel data
- BMP
- ICO

## EPS変換経路案

```text
EPS
 └─ Ghostscript pdfwrite + EPSCrop
     └─ PDF
         ├─ PDFとして出力
         ├─ pdftocairoでPNG / JPEG / SVGへ変換
         └─ sharpを使う既存経路でWebP / AVIFへ変換
```

EPSはPostScript programであるため、workspace内の安全な作業領域へコピーし、`-dSAFER`を付け、入力・出力pathを引数として渡す。実装前に、Ghostscriptのsecurity制約と許可するfile accessを改めて確認する。

## 変更可能なファイル

- `docs/research/`
- `docs/specs/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0129-design-additional-image-and-eps-formats.md`

## 対象外

- このタスク内でのdependency追加
- conversion commandの実装
- context menuの実装
- sharpのglobal libvipsへの切り替え
- Ghostscript binaryの同梱

## 関連

- [sharpとGhostscriptの追加形式予備調査](../research/2026-07-10-sharp-ghostscript-additional-formats.md)
- [出力形式基準の変換仕様](../specs/output-format-conversion.md)
- [変換入力preflightタスク](0128-design-input-preflight-validation.md)
- [ファイル操作security仕様](../specs/file-operation-security.md)

## 確認方法

- 採用sharp versionの`sharp.format`を3 OSで記録する
- 採用候補ごとに実fixtureをdecode・encodeできることを確認する
- EPSをGhostscriptでPDFへ変換し、BoundingBoxと描画内容を比較する
- 形式ごとのpage / frame semanticsが仕様へ明記されていることを確認する
