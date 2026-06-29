# タスク: convertToPngのレビュー指摘を反映する

## Status

Done

## 目的

PR #265 のGemini Code Assist指摘を確認し、妥当なものだけ反映する。

## 完了条件

- `convert_pdf_to_png.ts` のpath validationで、同じPDF入力と同じ作業ディレクトリをページ数分重複検証しない
- ページごとに異なる出力パスの検証は維持する
- 既存挙動は変えない

## 変更可能なファイル

- `src/operations/convert_pdf_to_png.ts`
- `docs/tasks/0059-address-convert-to-png-review.md`
- `docs/tasks/README.md`

## 対象外

- 変換仕様の変更
- 新しい対応形式の追加
- テスト期待値の変更

## 関連

- PR #265
- `docs/tasks/0058-implement-convert-to-png-pdf.md`

## 確認方法

- `pnpm run check`
- `pnpm run test`
