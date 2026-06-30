# タスク: 大文字拡張子の扱いを全体確認する

## Status

Done

## 目的

変換対象ファイルの拡張子判定が、大文字・小文字の違いで壊れないかを確認する。

対象例:

- `.PNG`
- `.JPG`
- `.SVG`
- `.MMD`
- `.DRAWIO.PNG`
- `.DIO.SVG`

## 完了条件

- command実行時の拡張子判定が大文字拡張子でも期待通り動くか確認する
- context menuの`resourceExtname` / `resourceFilename`条件が大文字拡張子を拾えるか確認する
- 不足があれば失敗テストを追加する
- 実装修正が必要な場合は別タスクとして分ける

## 変更可能なファイル

- `docs/tasks/0056-audit-uppercase-extension-handling.md`
- `docs/tasks/README.md`
- 必要な最小範囲のtest file
- 必要なら `package.json`

## 対象外

- 新しい入力形式の追加
- 出力テンプレート仕様の変更
- 変換処理全体のリファクタリング

## 確認方法

- `pnpm run check`
- 必要なら `pnpm run test`

## 確認結果

- command実行時の大文字拡張子は、追加テストで以下を確認した。
  - `.PNG`
  - `.DRAWIO.PNG`
- context menuの`resourceExtname` / `resourceFilename`条件は、大文字拡張子を拾えない可能性がある。
  - `package.json`のwhen clauseがcase-sensitiveな正規表現になっている。
  - `test/package_manifest.test.ts`に失敗テストを追加した。
- 実装修正は別タスク`0058`で行う。
