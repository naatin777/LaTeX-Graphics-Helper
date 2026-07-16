# PDF処理バックエンドの予備調査

## 調査日

2026-07-10

## 対象

- `pdf-lib`
- `@libpdf/core`
- PDFKit
- qpdf
- TeX WikiのPDF関連情報

## 公式情報源

- https://github.com/Hopding/pdf-lib
- https://github.com/libpdf-js/core
- https://github.com/foliojs/pdfkit
- https://github.com/qpdf/qpdf
- https://texwiki.texjp.org/?PDF

## 確認できた事実

### pdf-lib

- JavaScript runtime上でPDFを作成・変更できる。
- Node.js、browser、Deno、React Nativeを対象としている。
- page追加・削除・copy、既存PDF変更、form、font・画像埋め込みなどを提供する。
- MIT licenseである。

### @libpdf/core

- TypeScript向けにPDFのparse、変更、生成を提供する。
- merge・split、暗号化、署名、form、incremental saveなどを機能として掲げている。
- Node.js 20以降とmodern browserを対象としている。
- 2026-07-10時点でBetaと明記され、minor version間でもAPIが変わる可能性がある。
- MIT licenseで、`src/fontbox/`はApache-2.0である。
- JBIG2とJPEG2000はpassthroughのみなど、既知の制限がある。

### PDFKit

- Node.jsとbrowser向けのPDF生成libraryである。
- text、vector graphics、font embedding、annotationなど生成向け機能を提供する。
- 既存PDFのparse・変更を主目的としていないため、Crop・Split・Mergeの直接的な置き換え候補ではない。
- MIT licenseである。

### qpdf

- PDF内容を保持しながら構造変換するcommand line toolおよびC++ libraryである。
- split・merge、linearization、暗号化、構造解析などを提供する。
- PDFのrenderingやtext extraction、高水準のpage content編集は行わない。
- Apache-2.0 licenseである。
- VS Code拡張から使う場合は、外部binaryとして要求するかOS別binaryを配布するかの判断が必要になる。
- `qpdf --check`はfile構造、暗号化、linearization、stream dataのencodingを検査する。
- `qpdf --check`のexit codeは、cleanが`0`、errorが`2`、warningのみが`3`である。
- qpdf公式documentationも、検出できない問題やstream content内のerrorがあり得ると明記しているため、`--check`だけで完全性を保証できない。
- recoverableな状態はwarningとして扱われる。検査時に回復できても、回復結果を暗黙に後続処理へ使うべきかは別途判断が必要になる。

### TeX Wiki

- PDF、Ghostscript、Poppler、Xpdf、MuPDFなど、TeX利用者が接するPDF tool群を確認する入口として使える。
- 採用versionやAPI仕様の正本にはせず、候補発見後に各公式documentationを確認する。

## 現時点の見立て

- 現在のCrop・Split・Mergeをすぐに`pdf-lib`から置き換える根拠はまだない。
- `@libpdf/core`は、実PDFの読み込み耐性や既存要素の保持で問題が出た場合の比較候補として有力だが、Betaである点を評価する必要がある。
- PDFKitは画像や新規内容からPDFを生成する機能で比較する価値があるが、既存PDF編集の共通基盤候補として扱わない。
- qpdfは構造保持、修復、暗号化、分割・結合で有力だが、外部依存を増やす影響が大きい。
- 1つのtoolへ統一せず、生成・構造変換・描画検証で役割を分ける可能性も比較対象にする。

## 未確認事項

- 同じ複雑なPDFを各候補で保存した場合のannotation、outline、form、attachment、metadata保持
- CropBox・MediaBox変更後の表示互換性
- malformed PDFと暗号化PDFの読み込み成功率
- 大きなPDFでのmemory使用量と処理時間
- browser bundle sizeとVS Code extension package sizeへの影響
- qpdfのOS別導入方法とbinary配布条件
- qpdfのwarningを処理停止、確認付き続行、または許可設定のどれで扱うか
- qpdf検査に加えて全ページ描画検査を必須にする操作
- 各projectのrelease cadence、security対応、長期保守性
- TeX Wikiの指定ページから追加すべき候補

## 再確認条件

- PDF処理で実PDF互換性の問題が発生したとき
- Crop・Split・Merge GUIを本実装するとき
- encrypted PDF、署名、form、annotation保持を仕様へ追加するとき
- `pdf-lib`または`@libpdf/core`のmajor/minor updateを検討するとき
- qpdfなど外部binary追加を検討するとき

## 関連

- `docs/tasks/0127-evaluate-pdf-processing-backends.md`
- `docs/tasks/0128-design-input-preflight-validation.md`
- `docs/specs/internal/test-policy.md`
