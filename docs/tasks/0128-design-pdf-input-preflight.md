# タスク: PDF入力preflightの仕様を決める

## Status

Todo

## 目的

Crop・Split・Merge・変換を開始する前に入力PDFの破損、暗号化、page構造、page box、描画可否を検査し、処理途中の失敗や不完全な出力を減らす。

## 完了条件

- 「正常」「warningあり」「処理不能」「password必要」を区別する
- 軽量検査と全ページ描画を伴う詳細検査の範囲を決める
- `qpdf --check`、採用PDF parser、PDF.jsまたはPopplerの役割を決める
- qpdfがない環境での挙動を決める
- warningだけの場合に続行確認するか停止するかを決める
- 自動修復を行うか、元PDFを変更せず停止するかを決める
- 複数PDF処理で検査結果をまとめて表示する方法を決める
- progressとcancellationの対象範囲を決める
- Output channelへ残す診断情報を決める
- 破損fixture、warning fixture、暗号化fixtureを使うテスト方針を決める
- 正式仕様を`docs/specs/`へ記録する

## 検査候補

1. local fileかつworkspace内であること
2. PDF parserで読み込め、1ページ以上存在すること
3. 各ページのMediaBox、CropBox、Rotateが有限で妥当であること
4. qpdfの構造検査、暗号化、linearization、stream encoding検査
5. 必要な操作ではPDF.jsまたはPopplerで全対象ページを描画できること

## 初期提案

- 検査中は入力PDFを変更しない
- qpdfの自動回復結果を黙って処理へ使わない
- 構造errorは処理を停止する
- warningはOutput channelへ詳細を記録し、続行可否をユーザーへ1回だけ確認する
- passwordが必要なPDFは、password入力仕様を実装するまで明確な理由を表示して停止する
- qpdf単独で完全性を保証できないため、parser検査と必要に応じた描画検査を組み合わせる

## 変更可能なファイル

- `docs/research/`
- `docs/specs/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0128-design-pdf-input-preflight.md`

## 対象外

- このタスク内でのqpdf dependency追加
- PDFの自動修復実装
- password入力UIの実装
- 既存PDF処理へのpreflight組み込み

## 関連

- [PDF処理バックエンドの予備調査](../research/2026-07-10-pdf-processing-backends.md)
- [0127: PDF処理バックエンドを比較評価する](0127-evaluate-pdf-processing-backends.md)
- [ファイル操作security仕様](../specs/file-operation-security.md)

## 確認方法

- qpdf公式documentationと採用parserの仕様を根拠に判断していることを確認する
- clean、warning、error、password requiredの各結果が仕様で区別されていることを確認する
- 元PDFを暗黙に修復・上書きしないことを確認する
