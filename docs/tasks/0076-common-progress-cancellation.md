# タスク: withProgress cancellation handlingを共通化する

## Status

Done

## 目的

`vscode.window.withProgress` 内で `CancellationToken` から `AbortSignal` を作る処理が複数コマンドに重複しているため、小さいhelperへ切り出す。

## 完了条件

- `CancellationToken` から `AbortSignal` を作る共通helperを追加する
- helperは、callback登録後のcancelと、登録時点ですでにcancel済みのtokenの両方を扱う
- 既存の変換・crop・splitコマンドの挙動を変えずにhelperを使う
- cancellationの既存テストが通る

## 変更可能なファイル

- `src/commands/progress_cancellation.ts`
- `src/commands/crop_pdf_auto.ts`
- `src/commands/split_pdf_all_pages.ts`
- `src/commands/convert_png_to_pdf.ts`
- `src/commands/convert_to_png.ts`
- `src/commands/convert_to_jpeg.ts`
- `src/commands/convert_to_webp.ts`
- `src/commands/convert_to_avif.ts`
- `src/commands/convert_to_svg.ts`
- `docs/tasks/README.md`
- `docs/tasks/0076-common-progress-cancellation.md`

## 対象外

- 変換処理の設計変更
- `withProgress` 自体の共通化
- UI文言変更
- cancellation仕様の変更

## 確認方法

- `CI=true pnpm run test -- --grep "キャンセル|cancellation|AVIFに変換|WebPに変換|PNGに変換|JPEGに変換|SVGに変換|PDF全ページ分割|PDF自動crop処理"`
- `CI=true pnpm run check`
