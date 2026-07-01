# タスク: convertToPngの失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToPng`を実装する前に、対象入力と変換経路の期待を失敗テストとして固定する。

## 背景

0063で`convertToPng`の対象入力と変換経路を決めた。

特にDraw.ioは、直接PNG/JPEGへ出すと数式が描画されないため、必ずPDFを経由する必要がある。

## 完了条件

- `convertToPng`コマンドの登録テストを追加する
- Mermaid → PNGの失敗テストを追加する
- JPEG/WebP/AVIF → PNGの失敗テストを追加する
- SVG → PNGの失敗テストを追加する
- PDF → PNGの失敗テストを追加する
- Draw.io → PDF → PNG経由の失敗テストを追加する
- PNG入力は同じ形式への変換として拒否する失敗テストを追加する
- 出力PNGは完全一致ではなく、PNGとして読めることとサイズが0より大きいことを確認する

## 変更可能なファイル

- `docs/tasks/0064-add-convert-to-png-tests.md`
- `docs/tasks/README.md`
- `test/*`
- 必要なら test fixture

## 対象外

- `convertToPng`の実装
- package.jsonのcontext menu変更
- README更新

## 確認方法

- 追加したテストが未実装を理由に失敗することを確認する

## 実施内容

- `test/convert_to_png_command.test.ts`を追加した。
- `test/package_manifest.test.ts`へ`変換 > PNG`の公開条件を追加した。
- `test/convert_to_png_drawio_route.test.ts`を追加し、Draw.io CLIへPNGを直接要求せずPDF経由にする方針を固定した。

## 確認結果

- `CI=true pnpm run check`
- `CI=true pnpm run check:test`

上記は成功した。

以下は未実装を理由に失敗することを確認した。

```sh
CI=true pnpm run test -- --grep "PNGに変換|package.jsonの変換メニュー定義"
```

確認した主な失敗理由:

- `latex-graphics-helper.convertToPng`がまだ登録されていない
- `package.json`に`convertToPng`のmenu定義がない
- `package.nls.ja.json`に`command.convertToPng`がない
- `src/operations/convert_to_png.ts`がまだ存在しない
