# タスク: Windows rsvg-convert用ASCII stagingの失敗テストを追加する

## Status

Todo

## 目的

Windows rsvg-convertへASCII入出力pathだけを渡し、0 byte出力や別名出力を成功扱いしない仕様の失敗テストを追加する。

## 完了条件

- Unicode入力と出力をASCII名へmappingすることを確認する
- exit 0でも0 byteなら失敗にすることを確認する
- 別名出力を期待出力として扱わないことを確認する
- 実装fileを変更しない

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0147-add-windows-rsvg-ascii-staging-tests.md`

## 対象外

- staging実装
- Puppeteer engineの変更
- Ghostscriptとpdftocairoの変更

## 関連

- [ASCII staging仕様](0142-design-ascii-staging-for-external-tools.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)

## 確認方法

- 追加した失敗テスト
- `CI=true pnpm run check:all`
