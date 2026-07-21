# タスク: 変換入力preflightの仕様を決める

## Status

Spec Complete — `docs/specs/internal/input-preflight.md` に記録済み。実装は別タスク。

## 目的

PDF操作・画像変換・Draw.io・Mermaid変換を開始する前に、入力ファイルの破損、形式不一致、異常な構造、描画不能を検査し、処理途中の失敗や不完全な出力を減らす。
## 対象形式

- PDF
- PNG
- JPEG
- WebP
- AVIF
- GIF
- TIFF
- SVG
- EPS
- Mermaid（`.mmd`、`.mermaid`）
- Draw.io（`.drawio`、`.dio`、editable PNG / SVG）
## 完了条件

- 全形式で「正常」「warningあり」「処理不能」を区別する
- PDFでは「password必要」も区別する
- 拡張子だけでなく、実際の内容が期待形式として読めることを確認する
- 軽量な構造検査と、decode・renderを伴う詳細検査の範囲を形式ごとに決める
- 複数選択では全入力を先に検査し、処理不能な入力が1件でもあれば変換を開始しない
- warningだけの場合に続行確認するか停止するかを決める
- 自動修復を行うか、元ファイルを変更せず停止するかを決める
- progressとcancellationの対象範囲を決める
- Output channelへ残す診断情報を決める
- 形式ごとに正常・破損・拡張子不一致fixtureを使うテスト方針を決める
- file size、page count、pixel size、展開後memoryなどresource上限の要否を決める
- 正式仕様を`docs/specs/`へ記録する

## 形式別の検査候補

### 共通

1. local fileかつworkspace内であること
2. 読み取り可能で、空ファイルではないこと
3. 拡張子と検出した内容形式が一致すること
4. file sizeや展開後sizeが許容範囲であること

### PDF

1. PDF parserで読み込め、1ページ以上存在すること
2. 各ページのMediaBox、CropBox、Rotateが有限で妥当であること
3. qpdfで構造、暗号化、linearization、stream encodingを検査できること
4. 必要な操作ではPDF.jsまたはPopplerで全対象ページを描画できること

### Raster画像

1. sharpでmetadataを取得できること
2. width、height、page count、orientationが妥当であること
3. metadata取得だけでなく、必要に応じて全pixelをdecodeできること
4. 展開後のpixel数とmemory使用量が異常でないこと

### SVG

1. XMLとしてparseでき、rootがSVGであること
2. width、height、viewBoxが解釈可能であること
3. 外部resource参照とscriptをどう扱うか決めること
4. 採用rendererで実際に描画できること

### Mermaid

1. textとして読み取れること
2. Mermaid parserまたはCLIでsyntaxを解釈できること
3. 採用rendererでSVGを生成できること

### Draw.io

1. XML形式はDraw.io documentとしてparseできること
2. editable PNG / SVGは埋め込まれたdiagram dataをDraw.io CLIが読めること
3. page countまたはdiagram情報を取得できること
4. Draw.io CLIで安全な作業領域へ出力できること

## 初期提案

- 検査中は入力ファイルを変更しない
- parserやCLIの自動回復結果を黙って後続処理へ使わない
- 構造error、decode error、render errorは処理を停止する
- warningはOutput channelへ詳細を記録し、続行可否をユーザーへ1回だけ確認する
- passwordが必要なPDFは、password入力仕様を実装するまで理由を表示して停止する
- 1つのvalidatorだけで完全性を保証せず、形式に応じて構造検査とdecode・render検査を組み合わせる
- batch処理ではpreflight完了後に変換を開始し、検査途中で一部だけ出力しない

## 変更可能なファイル

- `docs/research/`
- `docs/specs/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0128-design-input-preflight-validation.md`

## 対象外

- このタスク内でのdependency追加
- 入力ファイルの自動修復実装
- password入力UIの実装
- 既存処理へのpreflight組み込み
## 関連

- [PDF処理バックエンドの予備調査](../research/2026-07-10-pdf-processing-backends.md)
- [0127: PDF処理バックエンドを比較評価する](0127-evaluate-pdf-processing-backends.md)
- [出力形式基準の変換仕様](../specs/internal/output-format-conversion.md)
- [入力preflightの内部契約](../specs/internal/input-preflight.md)
- [EPS変換の内部契約](../specs/internal/eps-conversion.md)


## 確認方法

- 各形式の公式documentationと採用parser・rendererの仕様を根拠に判断していることを確認する
- clean、warning、error、password requiredの結果が仕様で区別されていることを確認する
- 複数入力で変換開始前に全件検査されることを確認する
- 元ファイルを暗黙に修復・上書きしないことを確認する
