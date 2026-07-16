# タスク: Safe Modeの失敗テストを追加する

## Status

Done

## 目的

Safe Modeの状態管理、出力競合、バックアップ復元の安全条件を実装前に固定する。

## 完了条件

- 初期状態がONになるテストがある
- globalStateへON/OFFを保存するテストがある
- 両方残すで最小の連番パスを使用するテストがある
- 複数競合を1回の判断で処理するテストがある
- 上書きしない場合に何も反映しないテストがある
- 上書き時にバックアップを作成するテストがある
- 上書き後の取消で元ファイルを復元するテストがある
- 出力が変更されていれば復元しないテストがある
- 未実装を理由としてテストが失敗することを確認する

## 変更可能なファイル

- `test/safe_mode.test.ts`
- `test/commit_conversion_outputs.test.ts`
- `test/undo_last_conversion.test.ts`
- `docs/specs/internal/safe-mode.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0026-add-safe-mode-tests.md`
- `docs/tasks/0027-implement-safe-mode.md`

## 対象外

- Safe Modeの実装
- crop/splitへの組み込み
- PNG変換への組み込み

## 関連

- `docs/adr/0008-use-global-safe-mode-for-output-conflicts.md`
- `docs/specs/internal/safe-mode.md`

## 確認方法

- `pnpm run check:test`
- 未実装moduleにより失敗することを確認する

## 実施結果

- Safe Modeの初期ONとglobal stateへの保存テストを追加した
- 両方残す、1回の競合判断、上書きしない、バックアップ後上書きのテストを追加した
- 上書き後の取消で元ファイルを復元し、生成後に変更された場合は復元しないテストを追加した
- `pnpm run check:test`は未実装moduleと復元情報未対応により想定どおり失敗した
