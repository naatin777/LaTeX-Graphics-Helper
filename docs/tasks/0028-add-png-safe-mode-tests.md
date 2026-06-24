# タスク: PNG変換のSafe Mode失敗テストを追加する

## Status

Done

## 目的

PNGからPDFへの変換をSafe Modeへ統合する前に、必要な外部挙動を失敗テストとして固定する。

## Test target

- PNG変換結果を`.latex-graphics-helper/`内へ生成してから出力先へ反映すること
- 既存出力に対して、両方残す・上書きしない・上書きするが機能すること
- 複数PNGはすべての変換成功後に一括反映すること
- 上書き時にバックアップを作成し、直前の変換取消で元ファイルを復元すること
- キャンセル時に出力先へ何も反映しないこと

## Mocked

- Safe Modeの競合判断
- 必要な場合は進捗通知とキャンセルトークン

PNGからPDFへの変換とファイル反映には実ファイルを使用する。

## Not tested

- VS Codeのダイアログ表示
- status barの表示
- 他の画像形式

## 完了条件

- Safe Modeの各競合判断を注入できる失敗テストがある
- 複数PNGの一括反映と全体停止の失敗テストがある
- 上書き後の取消で元ファイルを復元する失敗テストがある
- キャンセル時に出力先を変更しない失敗テストがある
- 実装不足を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/convert_png_to_pdf.test.ts`
- PNG変換command専用の新規test file
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0028-add-png-safe-mode-tests.md`
- `docs/tasks/0029-integrate-png-conversion-with-safe-mode.md`

## 対象外

- `src/`の変更
- Safe Modeの実装
- 既存テストの都合のよい期待値変更
- dependency追加

## 関連

- `docs/specs/safe-mode.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0023-implement-png-to-pdf-conversion.md`

## 確認方法

- `pnpm run check:test`
- 追加したテストが実装不足により失敗することを確認する

## 実施結果

- `test/png_safe_mode.test.ts`を作成した
- 複数PNGを全件ステージング後に一括反映する失敗テストを追加した
- 複数競合に対して判断を1回だけ行う失敗テストを追加した
- 両方残す、上書きしない、上書きするの失敗テストを追加した
- 後続変換が失敗しても先行出力を反映しない失敗テストを追加した
- 実際のUndo処理で上書き前ファイルを復元する失敗テストを追加した
- キャンセル時に出力先を変更しない失敗テストを追加した
- 先行実装では一括反映とUndoを保証できず、テストの修正が必要であることを確認した
