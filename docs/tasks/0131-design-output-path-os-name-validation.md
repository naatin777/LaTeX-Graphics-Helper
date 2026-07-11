# タスク: outputPathのOS禁止名検証を設計する

## Status

Done

## 目的

`settings.json`の`outputPath`に実行OSで作成できない文字・名前が含まれる場合の挙動を決め、失敗テストへ渡せる仕様にする。

## 完了条件

- 自動置換、現在OS基準の拒否、全OS共通の拒否を比較する
- Windowsの禁止文字・制御文字・予約デバイス名・先頭末尾空白・末尾ピリオドを整理する
- POSIX系OSとの差を整理する
- 多言語・絵文字・全角空白など、禁止対象ではない文字を明確にする
- OSに依存せずWindows規則を検証できるテスト方法を決める
- commandが出力作業前に失敗することをテスト対象に含める

## 変更可能なファイル

- `docs/research/`
- `docs/specs/`
- `docs/tasks/README.md`
- `docs/tasks/0131-design-output-path-os-name-validation.md`

## 対象外

- production codeの変更
- test codeの変更
- path長上限への対応
- 外部filesystem固有の追加制限への対応

## 関連

- [outputPathのOS別ファイル名制限調査](../research/2026-07-11-output-path-os-filename-restrictions.md)
- [PDF configure crop仕様](../specs/crop-pdf-configure.md)
- [outputPath検証仕様](../specs/output-path-validation.md)

## 確認方法

- 調査済み事実と提案をユーザーが確認する
- 次の失敗テストタスクの期待値を一意に決められることを確認する
