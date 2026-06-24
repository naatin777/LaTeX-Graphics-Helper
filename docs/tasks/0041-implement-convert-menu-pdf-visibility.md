# タスク: 変換サブメニューのPDF表示へ移行する

## Status

Done

## 目的

Explorer context menuで、PDF出力変換を入力形式別サブメニューではなく、共有の`変換`サブメニュー配下の`PDF`として表示する。

0040で追加した失敗テストを通すための最小実装だけを行う。

## 背景

ADR-0009と`docs/specs/output-format-conversion.md`では、変換コマンドを出力形式基準で公開することを決めている。

まずは実装済みの`latex-graphics-helper.convertToPdf`だけを公開UIへ反映する。

旧PDF変換command IDは、移行直後の互換用aliasとしてextension内部に残してよい。

## 完了条件

- `package.json`の`contributes.commands`に`latex-graphics-helper.convertToPdf`が残る
- 旧PDF変換command IDを`contributes.commands`から外す
- Explorer context menuに共有`変換`サブメニューを追加する
- 共有`変換`サブメニュー配下に`latex-graphics-helper.convertToPdf`を表示する
- Explorer context menuから旧PDF変換command IDを外す
- 日本語表示で`変換` > `PDF`になる
- 既存の内部command登録や変換処理は変更しない

## 変更可能なファイル

- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/tasks/README.md`
- `docs/tasks/0041-implement-convert-menu-pdf-visibility.md`

## 対象外

- 旧command IDの削除
- `src/`の実装変更
- PDF以外の出力形式基準コマンド追加
- 入力形式別サブメニュー全体の整理
- context menu設定キーの再設計

## 関連

- `docs/adr/0009-use-output-format-conversion-commands.md`
- `docs/specs/output-format-conversion.md`
- `docs/tasks/0040-add-legacy-to-pdf-command-visibility-tests.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
