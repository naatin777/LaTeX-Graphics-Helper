# タスク: crop fixtureテストで設定済みpdftocairoを使う

## Status

Done

## 目的

固定PDF fixtureの画像比較テストで、実行ファイル名を直接指定せず、`settings.json`の`latex-graphics-helper.execPath.pdftocairo`を使う。

## 背景

Windows CIはPopplerを一時ディレクトリへ展開し、`pdftocairo.exe`の絶対パスをworkspaceの`settings.json`へ保存している。新しいcrop画像比較テストだけが`pdftocairo`という名前を直接実行していたため、実体確認後のVS Codeテストで`spawn pdftocairo ENOENT`になった。

## 完了条件

- crop画像比較テストが`latex-graphics-helper.execPath.pdftocairo`を読む
- 設定がない場合だけ`pdftocairo`へfallbackする
- Windows CIで設定された絶対パスを使える
- PATH変更、環境変数、テストskip、mockへ置き換えない
- テスト内の外部ツール直接起動箇所を監査し、同種の見落としがないことを確認する

## 変更可能なファイル

- `test/crop_pdf_configure_operation.test.ts`
- `docs/tasks/README.md`
- `docs/tasks/0138-use-configured-pdftocairo-in-crop-fixture-tests.md`

## 対象外

- CIでの外部ツールinstall方式の変更
- extension実装の変更
- mock用に渡している外部ツール名の変更
- unrelated refactoring

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- PR #308の3 OS CI
