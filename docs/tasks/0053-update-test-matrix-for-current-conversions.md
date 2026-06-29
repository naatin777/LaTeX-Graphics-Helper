# タスク: 現在の変換実装に合わせてtest-matrixを更新する

## Status

Done

## 目的

`docs/test-matrix.md`を現在の変換実装とテスト状況に合わせて更新する。

次の変換機能追加前に、何がテスト済みで何が未実装・未テストかを誤認しないようにする。

## 完了条件

- `convertToPdf`の対応入力を現状に合わせて更新する
- Mermaid → SVG / PDF のテスト状況を反映する
- 未実装の出力形式基準コマンドを明記する
- Safe Mode / Undo / progress / cancellation のテスト状況を現在の範囲で整理する
- 実装変更は行わない

## 変更可能なファイル

- `docs/test-matrix.md`
- `docs/tasks/0053-update-test-matrix-for-current-conversions.md`
- `docs/tasks/README.md`

## 対象外

- `src/`の実装変更
- `test/`の変更
- README更新
- 新しい変換コマンドの追加

## 関連

- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/specs/output-format-conversion.md`
- `docs/test-policy.md`

## 確認方法

- `git diff --check`
