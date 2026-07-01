# タスク: convertToPngを実装する

## Status

Done

## 目的

`latex-graphics-helper.convertToPng`を実装し、複数の入力形式をPNGへ変換できるようにする。

## 背景

0063で仕様を決め、0064で失敗テストを追加する。

このタスクでは、0064の失敗テストを通す最小実装を行う。

## 完了条件

- `latex-graphics-helper.convertToPng`を公開コマンドとして登録する
- Explorerの`変換 > PNG`へ統合する
- PDF / SVG / Mermaid / Draw.io / JPEG / WebP / AVIF入力を受け付ける
- PNG入力は拒否する
- Mermaid → PNGはMermaid CLIで直接出力する
- Draw.io → PNGは必ずDraw.io → PDF → PNG経由にする
- その他は基本的に最短経路でPNGへ変換する
- Safe Mode / Undo / progress / cancellation を既存変換と同じ扱いにする
- 0064で追加したテストを通す

## 変更可能なファイル

- `docs/tasks/0065-implement-convert-to-png.md`
- `docs/tasks/README.md`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `src/**`
- `test/**`

## 対象外

- `convertToJpeg` / `convertToWebp` / `convertToAvif`の実装
- 出力形式基準の新しい`outputPath.convertToPng`設定追加
- 画像内容の完全一致テスト
- README更新

## 確認方法

- `pnpm run check`
- `pnpm run test`

## 実施内容

- `latex-graphics-helper.convertToPng`を登録した
- Explorerの`変換 > PNG`へ追加した
- PDF / SVG / Mermaid / Draw.io / JPEG / WebP / AVIF入力をPNGへ変換する処理を追加した
- PNG入力はPNG変換対象外として拒否するようにした
- Mermaid → PNGはMermaid CLIで直接出力するようにした
- Draw.io → PNGはDraw.io CLIでPDFを作成してからPDF→PNGへ変換するようにした
- 変換結果の反映は既存のSafe Mode / Undo対応処理に乗せた
- `outputPath.convertMermaidToPng`設定を追加した
- Draw.ioがPDF経由でPNG化されることをoperation testで確認した

## 確認結果

- `CI=true pnpm run check`
- `CI=true pnpm run test -- --grep "PNGに変換|package.jsonの変換メニュー定義"`
- `CI=true pnpm run test`
