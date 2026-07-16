# タスク: MermaidをPDFに変換する失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`で`.mmd`と`.mermaid`をPDFへ変換できるようにするための失敗テストを追加する。

このタスクではテストだけを追加し、実装は行わない。

## 背景

Mermaid → SVGは`latex-graphics-helper.convertToSvg`で実装済み。

次は既存の出力形式基準コマンドである`convertToPdf`へ、Mermaid入力を追加する。

Mermaid専用コマンドは作らず、他の画像形式と同じように`変換 > PDF`から扱う。

## 完了条件

- `convertToPdf`で`.mmd`をPDFに変換できることをテストする
- `convertToPdf`で`.mermaid`をPDFに変換できることをテストする
- 出力PDFが存在し、PDFとして読み取れることをテストする
- 出力PDFが1ページ以上であることをテストする
- context menu / package manifest上で`.mmd` / `.mermaid`が`変換 > PDF`対象になることを確認する
- テスト追加のみを行い、実装変更は次タスクへ分ける

## 変更可能なファイル

- `test/`
- `docs/tasks/0051-add-convert-to-pdf-mermaid-tests.md`
- `docs/tasks/README.md`

## 対象外

- `src/`の実装変更
- `package.json`の実装変更
- dependency追加
- Mermaid → PNG / JPEG / WebP / AVIF
- Mermaid出力の見た目やテーマ設定
- 画像比較テスト

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0047-design-mermaid-file-conversion.md`
- `docs/tasks/0050-implement-convert-to-svg-mermaid.md`

## 確認方法

- `CI=true pnpm run test`
- 実装前なので、追加したテストが失敗することを確認する
