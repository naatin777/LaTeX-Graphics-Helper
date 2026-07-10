# タスク: PDF処理バックエンドを比較評価する

## Status

Todo

## 目的

現在利用している`pdf-lib`を無条件に使い続けるのではなく、PDF機能ごとに適したlibraryまたはCLIを比較し、今後のCrop・Split・Merge・PDF生成の処理基盤を判断する。

## 完了条件

- `pdf-lib`、`@libpdf/core`、PDFKit、qpdfを比較する
- TeX WikiのPDF関連情報を参考に、Ghostscript、Poppler、MuPDFなど追加候補の要否を整理する
- Crop、Split、Merge、画像からPDF生成、PDF検証の機能ごとに候補を評価する
- malformed PDF、暗号化PDF、annotation、form、outline、attachment、署名、metadataの保持可否を確認する
- JavaScriptのみで動くか、外部binaryまたはnative moduleが必要かを確認する
- macOS、Windows、Linuxへの導入方法とVS Code拡張での配布方法を比較する
- license、bundle size、memory使用量、速度、cancellation、security、保守状況を比較する
- ユーザー提供の複雑なPDF fixtureで互換性と出力保持を比較する
- 採用または現状維持の判断をADRへ記録する

## 変更可能なファイル

- `docs/research/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0127-evaluate-pdf-processing-backends.md`
- 比較用testまたはbenchmarkを追加する場合は、着手前に変更範囲を追記する

## 対象外

- 比較前のdependency追加
- 比較前の既存PDF処理置き換え
- PDF処理architectureの全面変更
- 単一libraryへ全機能を統一すること自体を目的にすること

## 比較候補

- https://github.com/Hopding/pdf-lib
- https://github.com/libpdf-js/core
- https://github.com/foliojs/pdfkit
- https://github.com/qpdf/qpdf
- https://texwiki.texjp.org/?PDF

## 関連

- [PDF処理バックエンドの予備調査](../research/2026-07-10-pdf-processing-backends.md)
- [テスト方針](../test-policy.md)
- [0126: 実fixtureと画像比較を使うテスト方針を決める](0126-design-real-fixture-and-visual-testing.md)

## 確認方法

- 公式documentationとrelease情報に基づく比較表を確認する
- 同じfixtureを各候補で処理した結果と実行条件を確認する
- ADRに機能別の採否と再評価条件が書かれていることを確認する
