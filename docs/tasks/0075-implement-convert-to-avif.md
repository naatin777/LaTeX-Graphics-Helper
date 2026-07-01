# タスク: convertToAvifを実装する

## Status

Done

## 目的

`latex-graphics-helper.convertToAvif` を追加し、複数の入力形式をAVIFへ変換できるようにする。

## 完了条件

- `latex-graphics-helper.convertToAvif` を公開コマンドとして登録する
- Explorerの `変換 > AVIF` へ統合する
- PDF / PNG / JPEG / WebP / SVG / Mermaid / Draw.io 入力をAVIFへ変換できる
- AVIF入力はAVIF変換対象外として拒否する
- Draw.io → AVIF は Draw.io CLIで直接AVIF/JPEGへ出さず、PDF → PNG → AVIF を経由する
- AVIF出力の `effort` は `latex-graphics-helper.convertToAvif.effort` で設定できる
- WebP出力の `effort` も `latex-graphics-helper.convertToWebp.effort` で設定できる
- 変換結果は `.latex-graphics-helper/` 作業領域で作成してからSafe Mode / Undo対応の反映処理に乗せる
- 変換テストでは実ファイル読み込み経路を通す

## 変更可能なファイル

- `src/extension.ts`
- `src/commands/convert_to_avif.ts`
- `src/operations/convert_to_avif.ts`
- `src/commands/convert_to_webp.ts`
- `src/operations/convert_to_webp.ts`
- `test/convert_to_avif_command.test.ts`
- `test/convert_to_avif_operation.test.ts`
- `test/convert_to_webp_command.test.ts`
- `test/convert_to_webp_operation.test.ts`
- `test/package_manifest.test.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `PROJECT_STATE.md`
- `docs/tasks/README.md`
- `docs/tasks/0075-implement-convert-to-avif.md`

## 対象外

- AVIF出力のpixel完全一致・画像比較
- Draw.io CLI実体を使ったUI統合確認
- 既存変換処理の共通化

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/test-policy.md`

## 確認方法

- `CI=true pnpm run test -- --grep "AVIFに変換|WebPに変換|package.jsonの変換メニュー定義"`
- `CI=true pnpm run check`
