# タスク: Windows Ghostscript用ASCII stagingの失敗テストを追加する

## Status

Todo

## 目的

Windows GhostscriptへUnicode pathを直接渡さず、ASCII名へmappingして処理する仕様の失敗テストを追加する。

## 完了条件

- タスク0142で決めたstaging仕様をテストする
- Unicode入力をASCII名でGhostscriptへ渡すことを確認する
- 途中出力や別名出力を成功扱いしないことを確認する
- 完成出力の論理pathがユーザー指定名を維持することを確認する
- 実装fileを変更しない

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0143-add-windows-ghostscript-ascii-staging-tests.md`

## 対象外

- staging実装
- pdftocairoとrsvg-convertの変更

## 関連

- [ASCII staging仕様](0142-design-ascii-staging-for-external-tools.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)

## 確認方法

- 追加した失敗テスト
- `CI=true pnpm run check:all`
