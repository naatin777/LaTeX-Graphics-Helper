# タスク: convertToSvgの入力形式をPDFとDraw.ioへ広げる

## Status

Done

## 目的

`latex-graphics-helper.convertToSvg` を Mermaid 専用ではなく、仕様どおり PDF と Draw.io 入力にも対応させる。

## 完了条件

- `convertToSvg` で PDF をページごとの SVG へ変換できる
- `convertToSvg` で editable Draw.io 画像を SVG へ変換できる
- Explorer の `変換 > SVG` に PDF と editable Draw.io 画像が表示される
- Safe Mode / Undo / progress / cancellation は既存変換と同じ扱いにする
- 変換テストでは実ファイル読み込み経路を通す

## 変更可能なファイル

- `src/commands/convert_to_svg.ts`
- `src/operations/convert_to_svg.ts`
- `test/convert_to_svg_command.test.ts`
- `test/convert_to_svg_operation.test.ts`
- `test/package_manifest.test.ts`
- `package.json`
- `docs/tasks/README.md`
- `docs/tasks/0073-expand-convert-to-svg-inputs.md`

## 対象外

- PNG / JPEG / WebP / AVIF から SVG への変換
- SVG出力のpixel完全一致・画像比較
- Draw.io CLI 実体を使ったUI統合確認
- Mermaid theme / look / backgroundColor 設定

## 関連

- `docs/specs/internal/output-format-conversion.md`
- `docs/specs/internal/test-policy.md`

## 確認方法

- `CI=true pnpm run test -- --grep "SVGに変換|package.jsonの変換メニュー定義"`
- `CI=true pnpm run check`
