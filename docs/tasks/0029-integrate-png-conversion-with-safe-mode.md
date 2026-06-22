# タスク: PNG変換を安全な作業領域とSafe Modeへ統合する

## Status

Todo

## 目的

0028で追加したテストを通す最小実装により、PNGからPDFへの変換を共通のSafe Mode出力反映へ統合する。

## 完了条件

- PNG変換を`.latex-graphics-helper/`内で完了する
- 既存出力をSafe Modeで処理する
- 上書き時にバックアップを作成する
- 直前の変換取消へ対応する
- `withProgress`とキャンセルへ対応する
- 複数PNGを全成功後に一括反映する
- 0028で追加したテストが成功する
- `.vscode-test.mjs`を使用するテストを1回以上実行する

## 変更可能なファイル

- `src/commands/convert_png_to_pdf.ts`
- `src/operations/convert_png_to_pdf.ts`
- Safe ModeとUndoの既存module（必要な最小変更のみ）
- `docs/specs/safe-mode.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0029-integrate-png-conversion-with-safe-mode.md`

## 対象外

- テスト期待値の変更
- 他の画像形式
- Safe Mode仕様の変更
- dependency追加
- 関係のないリファクタリング

## 関連

- `docs/specs/safe-mode.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0028-add-png-safe-mode-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
