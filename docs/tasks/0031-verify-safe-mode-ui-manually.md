# タスク: Safe ModeのVS Code UIを手動確認する

## Status

Todo

## 目的

自動テストでは確認しないSafe Modeのダイアログとstatus barを、実際のVS Code画面で確認して記録する。

## 確認項目

- 拡張機能の起動後にstatus barへ`Safe Mode: ON`が表示される
- status barを選択するとON/OFFが切り替わる
- VS Codeを再起動しても選択した状態が復元される
- Safe Mode ONで既存出力がある場合にmodal dialogが1回表示される
- `Keep Both`、`Do Not Overwrite`、`Overwrite`をそれぞれ選択できる
- ダイアログを閉じると出力を上書きしない
- Safe Mode OFFでは既存出力があってもダイアログを表示しない
- cropとsplitの両方で確認する
- 0029完了後はPNG変換でも確認する

## 完了条件

- 各確認項目の結果をこのタスクへ記録する
- 不具合があれば修正を混ぜず、問題ごとに別タスクを作成する
- crop、split、PNGの未確認項目が明示されている

## 変更可能なファイル

- `docs/tasks/0031-verify-safe-mode-ui-manually.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`

## 対象外

- 実装変更
- テストコード追加
- UIデザイン変更
- 発見した不具合の修正

## 関連

- `docs/specs/safe-mode.md`
- `docs/tasks/0029-integrate-png-conversion-with-safe-mode.md`
- `docs/tasks/0030-add-safe-mode-dialog-result-tests.md`

## 確認方法

- Extension Development Hostを起動する
- workspace内のテスト用PDF・PNGを使用する
- 既存出力を用意し、選択肢ごとの出力と元ファイルを確認する
