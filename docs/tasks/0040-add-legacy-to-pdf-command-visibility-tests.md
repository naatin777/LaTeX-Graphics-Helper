# タスク: 変換サブメニューのPDF表示へ移行する失敗テストを追加する

## Status

Done

## 目的

Explorer context menuの変換UIを、入力形式ごとのサブメニューではなく、`変換`サブメニュー配下に出力形式を表示する形へ移行するための失敗テストを追加する。

まずは実装済みの`PDF`出力だけを対象にする。

このタスクではテストだけを追加し、`package.json`や実装は変更しない。

## 背景

ADR-0009と`docs/specs/output-format-conversion.md`では、変換コマンドを出力形式基準で公開することを決めている。

`latex-graphics-helper.convertToPdf`は追加済みだが、現状の`package.json`には旧入力形式別PDF変換コマンドがまだ公開UIとして残っている。

また、日本語UIとしては`PDFに変換`よりも、`変換`サブメニュー配下に`PDF`、`PNG`、`SVG`のような出力形式だけを並べる方が直感的である。

例:

- `latex-graphics-helper.convertPngToPdf`
- `latex-graphics-helper.convertJpegToPdf`
- `latex-graphics-helper.convertWebpToPdf`
- `latex-graphics-helper.convertAvifToPdf`
- `latex-graphics-helper.convertSvgToPdf`
- `latex-graphics-helper.convertDrawioToPdf`

旧command ID自体は、移行直後の互換用aliasとして内部登録されていてよい。

## 完了条件

- `package.json`の`contributes.commands`に`latex-graphics-helper.convertToPdf`が残ることをテストする
- `package.json`の`contributes.commands`に旧PDF変換コマンドが含まれないことをテストする
- `package.json`のExplorer context menuに旧PDF変換コマンドが含まれないことをテストする
- Explorer context menuに`変換`サブメニューが存在し、その配下に`latex-graphics-helper.convertToPdf`が表示されることをテストする
- 日本語表示ではExplorer context menu上の出力形式コマンドが`PDF`として表示されることをテストする
- 旧command IDをextension内部の非公開aliasとして登録できる余地は残す
- テスト追加のみを行い、実装変更は次タスクへ分ける

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0040-add-legacy-to-pdf-command-visibility-tests.md`

## 対象外

- `package.json`のcommands/menus変更
- 旧command IDの削除
- `convertToPdf`の対応入力形式追加
- `PNG`、`JPEG`、`WebP`、`AVIF`、`SVG`出力コマンドの実装
- 旧PDF以外の変換コマンド整理

## 関連

- `docs/adr/0009-use-output-format-conversion-commands.md`
- `docs/specs/output-format-conversion.md`
- `docs/tasks/0034-add-convert-to-pdf-output-format-tests.md`
- `docs/tasks/0035-implement-convert-to-pdf-output-format-command.md`

## 確認方法

- `pnpm run check:test`
- 必要なら対象テストだけを実行する
