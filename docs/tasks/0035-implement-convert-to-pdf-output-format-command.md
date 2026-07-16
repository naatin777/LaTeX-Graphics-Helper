# タスク: PDFに変換コマンドを実装する

## Status

Done

## 目的

出力形式基準の`PDFに変換`コマンドを、追加済みテストを通す最小範囲で実装する。

## 方針

- 公開command IDは`latex-graphics-helper.convertToPdf`にする
- 表示名は`PDFに変換`にする
- まず既存のPNG→PDF実装を委譲して、出力形式基準コマンドの骨格を作る
- JPEG、WebP、AVIF、SVG、Draw.io対応は、同じタスクで無理に広げない
- 対応していない入力が含まれる場合は、変換全体を開始しない
- 複数入力は1つの変換バッチとして扱う
- Safe Mode、Undo、Progress、Cancellationは既存仕様に従う
- 旧`latex-graphics-helper.convertPngToPdf`は、必要なら非公開aliasとして新commandへ委譲する

## 完了条件

- `latex-graphics-helper.convertToPdf`が登録されている
- PNGを`PDFに変換`できる
- 複数PNGを1回のコマンドでPDFへ変換できる
- PDFページサイズが入力画像のpixel幅・高さと同じ数値のpointになる
- 非対応入力が含まれる場合は全体停止する
- Safe Mode、Undo、Progress、Cancellationの既存テストが通る
- 追加済みテストが通る
- 実装範囲をPNG→PDF以外へ広げない

## 変更可能なファイル

- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `src/`
- 関連するtest fileの期待値調整。ただし仕様変更は禁止
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0035-implement-convert-to-pdf-output-format-command.md`

## 対象外

- JPEG、WebP、AVIF、SVG、Draw.ioからPDFへの本実装
- `PNGに変換`など他の出力形式基準コマンドの実装
- 画像を1つのPDFへ結合する機能
- 既存設定の削除
- dependency追加
- 大規模な変換基盤リファクタ

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0034-add-convert-to-pdf-output-format-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
- `git diff --check`
