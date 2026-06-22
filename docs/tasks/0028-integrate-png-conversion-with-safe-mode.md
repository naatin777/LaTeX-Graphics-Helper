# タスク: PNG変換を安全な作業領域とSafe Modeへ統合する

## Status

Todo

## 目的

PNGからPDFへの変換を`.latex-graphics-helper/`内で完了させ、共通のSafe Mode出力反映へ統合する。

## 完了条件

- PNG変換を作業領域内で完了する
- 既存出力をSafe Modeで処理する
- 上書き時にバックアップを作成する
- 直前の変換取消へ対応する
- withProgressとキャンセルへ対応する
- 複数PNGを全成功後に一括反映する

## 変更可能なファイル

- 実装前に対象を確認する

## 対象外

- 他の画像形式
- safe mode仕様の変更

## 関連

- `docs/specs/safe-mode.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0023-implement-png-to-pdf-conversion.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
