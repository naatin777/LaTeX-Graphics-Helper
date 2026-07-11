# タスク: Windows Ghostscript用ASCII scratchを実装する

## Status

Done

## 目的

タスク0143の失敗テストを通す最小実装として、Windows Ghostscriptへ安全なASCII入力pathだけを渡す。

## 完了条件

- タスク0143のテストが成功する
- Unicodeを含む元pathとoutputPathを維持する
- WindowsではGhostscriptへ固定ASCII名の`input.pdf`だけを渡す
- scratch入力がabsolute ASCII pathの非0 byte regular fileであることを確認する
- 全ページのbbox取得とworkspace内staging作成に成功した場合だけscratchを削除する
- 失敗・cancel時はscratchを残してOutput channelへ記録する
- `os.tmpdir()`が使えない場合は`SystemRoot/Temp`へfallbackする
- Safe Mode、Undo、cancel、作業領域の既存仕様を維持する

## 変更可能なファイル

- `src/operations/crop_pdf_auto.ts`
- `src/operations/external_tool_ascii_scratch.ts`
- OS非依存の既存cropテストへplatformを明示する最小変更
- `docs/tasks/README.md`
- `docs/tasks/0144-implement-windows-ghostscript-ascii-staging.md`

## 対象外

- pdftocairoとrsvg-convertの変更
- crop仕様の変更

## 関連

- [Ghostscript scratch失敗テスト](0143-add-windows-ghostscript-ascii-staging-tests.md)
- [外部コマンド用ASCII scratch仕様](../specs/external-tool-ascii-scratch.md)
- [ADR-0012](../adr/0012-use-os-temp-for-incompatible-windows-tools.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- Windows GitHub Actions
