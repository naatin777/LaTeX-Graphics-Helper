# タスク: Safe Modeダイアログ結果のテストを追加する

## Status

Done

## 目的

Safe Mode ON時のダイアログ選択結果が、正しい競合判断へ変換されることを自動テストで固定する。

## Test target

- `Keep Both`を選ぶと`keep-both`になること
- `Do Not Overwrite`を選ぶと`cancel`になること
- `Overwrite`を選ぶと`overwrite`になること
- ダイアログを閉じると`cancel`になること
- `Do Not Overwrite`が`isCloseAffordance`として渡されること
- 独立した`Cancel`選択肢を渡さないこと
- Safe Mode OFFではダイアログを表示せず`overwrite`になること
- Safe Mode ONで複数競合があってもダイアログを1回だけ表示し、競合件数を渡すこと

## Mocked

- `vscode.window.showWarningMessage`の戻り値
- `ExtensionContext.globalState`相当の状態保存

最初にSinonで`showWarningMessage`をstubできるか確認する。VS Code APIのmodule境界により安定してstubできない場合は、実装を変更せずに無理なmockを増やさず、ダイアログ関数を注入可能にする別のImplementation Phaseタスクを作成する。

## Not tested

- ダイアログが画面上で正しく描画されること
- ボタンの配置や外観
- status barの描画
- ファイルの実際の反映処理

## 完了条件

- 3つの選択肢だけを表示し、ダイアログを閉じた場合を検証するテストがある
- Safe Mode OFFでダイアログを呼ばないことを検証するテストがある
- 複数競合時に1回の判断だけを求めることを検証するテストがある
- test file冒頭にTest target、Mocked、Not testedが記載されている
- `src/`を変更せずにテストを追加する

## 変更可能なファイル

- Safe Mode command専用の新規test file
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0030-add-safe-mode-dialog-result-tests.md`

## 対象外

- `src/`の変更
- ダイアログ文言やSafe Mode仕様の変更
- status barの自動テスト
- dependency追加

## 関連

- `docs/specs/internal/safe-mode.md`
- `docs/specs/internal/test-policy.md`
- `docs/tasks/0026-add-safe-mode-tests.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
