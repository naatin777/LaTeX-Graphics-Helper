# タスク: convertToWebpを実装する

## Status

Done

## 目的

`latex-graphics-helper.convertToWebp` を追加し、複数の入力形式をWebPへ変換できるようにする。

## 完了条件

- `latex-graphics-helper.convertToWebp` を公開コマンドとして登録する
- Explorerの `変換 > WebP` へ統合する
- PDF / PNG / JPEG / AVIF / SVG / Mermaid / Draw.io 入力をWebPへ変換できる
- WebP入力はWebP変換対象外として拒否する
- Draw.io → WebP は Draw.io CLIで直接WebP/JPEGへ出さず、PDF → PNG → WebP を経由する
- 変換結果は `.latex-graphics-helper/` 作業領域で作成してからSafe Mode / Undo対応の反映処理に乗せる
- 変換テストでは実ファイル読み込み経路を通す

## 変更可能なファイル

- `src/extension.ts`
- `src/commands/convert_to_webp.ts`
- `src/operations/convert_to_webp.ts`
- `test/convert_to_webp_command.test.ts`
- `test/convert_to_webp_operation.test.ts`
- `test/package_manifest.test.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `PROJECT_STATE.md`
- `docs/tasks/README.md`
- `docs/tasks/0074-implement-convert-to-webp.md`

## 対象外

- `convertToAvif` の実装
- WebP出力のpixel完全一致・画像比較
- Draw.io CLI実体を使ったUI統合確認
- WebP品質設定の公開

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/test-policy.md`

## 確認方法

- `CI=true pnpm run test -- --grep "WebPに変換|package.jsonの変換メニュー定義"`
- `CI=true pnpm run check`
