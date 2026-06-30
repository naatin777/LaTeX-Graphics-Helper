# タスク: 変換context menuの拡張子判定を大文字小文字非依存にする

## Status

Done

## 目的

VS Code Explorerのcontext menuで、大文字拡張子の変換対象ファイルにも`変換 > PDF`を表示できるようにする。

対象例:

- `.PNG`
- `.JPG`
- `.SVG`
- `.MMD`
- `.DRAWIO.PNG`
- `.DIO.SVG`

## 完了条件

- 0056で追加した失敗テストが通る
- `resourceExtname`の正規表現が大文字拡張子を拾える
- `resourceFilename`の複合拡張子正規表現が大文字拡張子を拾える
- command側の変換挙動は変更しない

## 変更可能なファイル

- `docs/tasks/0058-make-convert-context-menu-extension-matching-case-insensitive.md`
- `docs/tasks/README.md`
- `package.json`

## 対象外

- 新しい入力形式の追加
- command実装の変更
- テスト名の日本語化
- 変換処理全体のリファクタリング

## 関連

- `docs/tasks/0056-audit-uppercase-extension-handling.md`

## 確認方法

- `pnpm run check`
- `pnpm run test`
