# タスク: Ghostscriptがない場合のエラーハンドリングをテストする

## Status

Done

## 目的

Ghostscriptが見つからない場合や実行に失敗した場合に、適切なエラーが発生することをテストする。

## 完了条件

- Ghostscript実行可能ファイルが見つからない場合のテストを追加する
- Ghostscript実行が失敗した場合のテストを追加する
- エラーメッセージがユーザーに分かりやすいことを確認する

## 変更可能なファイル

- `test/crop_pdf_auto.test.ts`

## 対象外

- 実装の変更
- エラーメッセージの文言調整（必要な場合のみ）
- Ghostscriptのインストール検証機能の追加

## 関連

- `docs/specs/auto-crop.md`

## 確認方法

- `pnpm run test`

## 実施結果

- Ghostscript実行可能ファイルが見つからない場合（ENOENT）のテストを追加した
- Ghostscript実行が失敗した場合のテストを追加した
- 両方のテストでエラー時に出力ファイルが作成されないことを検証した
- `pnpm run test` 成功（37 tests）
