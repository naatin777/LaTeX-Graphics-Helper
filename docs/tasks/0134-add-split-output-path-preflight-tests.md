# タスク: splitPdfのoutputPath事前検証失敗テストを追加する

## Status

Todo

## 目的

`splitPdf`で無効な`outputPath`設定を、進捗表示や一時作業ファイル作成より前に拒否するための失敗テストを追加する。

## Test Addition Phase

このタスクではテストだけを追加し、実装は変更しない。

## 背景

`splitPdf`はページ数を読み取った後にページごとの出力パスを解決しているため、共通のOS禁止名検証は働くものの、検出時点が`withProgress`開始後かつ入力PDFの一時コピー後になっている。

## テストすること

- Windows規則で無効になる`outputPath.splitPdf`を設定する
- command実行時にエラー通知が表示される
- `withProgress`を開始しない
- `.latex-graphics-helper/split-pdf`へ入力コピーや出力を作成しない
- PDF分割処理を開始しない

## 変更可能なファイル

- split PDF command test
- split PDF test helper
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0134-add-split-output-path-preflight-tests.md`

## 対象外

- `src/`の変更
- split処理の実装変更
- 他commandのテスト追加
- エラー文言の多言語対応

## 関連

- [outputPath検証仕様](../specs/output-path-validation.md)
- [0133: outputPathのOS禁止名検証を実装する](0133-implement-output-path-os-name-validation.md)
