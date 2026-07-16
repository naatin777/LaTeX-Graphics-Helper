# タスク: 実行可能な変換context menuを共有サブメニューへ集約する

## Status

Done

## 目的

Explorer context menuの変換項目を、入力形式別サブメニューではなく、共有の`変換`サブメニューに集約する。

ただし、現時点で実行登録されていない変換commandは表示しない。

## 背景

`docs/specs/internal/output-format-conversion.md`では、最終的に出力形式基準の統合コマンドへ移行する方針を決めている。

ただし現時点では、`convertToPdf`以外の統合コマンドは実装されていない。

また、既存の入力形式・出力形式ペア別command IDも、多くは`src/extension.ts`で実行登録されていない。クリックして壊れる項目を出さないため、このタスクでは変換context menuを実行可能な`convertToPdf`だけに限定する。

他形式の統合commandは、変換処理を実装するタスクで個別に追加する。

## 完了条件

- Explorer context menuから入力形式別変換サブメニューを外す
- 共有`変換`サブメニュー配下には`latex-graphics-helper.convertToPdf`だけを配置する
- 変換context menu上に未登録の変換commandを表示しない
- `convertToPdf`は`PDF`として表示する
- `src/`の変換実装は変更しない
- 未登録の新command IDは追加しない

## 変更可能なファイル

- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/tasks/README.md`
- `docs/tasks/0042-consolidate-existing-convert-context-menu.md`

## 対象外

- `convertToPng`などの新しい統合command実装
- 既存command IDの内部登録削除
- 変換ロジックの修正
- 出力パス設定の移行
- 形式ごとのmanifestテスト追加

## 関連

- `docs/adr/0009-use-output-format-conversion-commands.md`
- `docs/specs/internal/output-format-conversion.md`
- `docs/tasks/0041-implement-convert-menu-pdf-visibility.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`
