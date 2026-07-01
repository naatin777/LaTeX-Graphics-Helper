# タスク: convertToPngの仕様を決める

## Status

Done

## 目的

出力形式基準コマンド`latex-graphics-helper.convertToPng`を実装する前に、対象入力、変換経路、テスト方針を決める。

## 背景

`next/v1`では、出力形式基準コマンドとして`convertToPdf`と`convertToSvg`を実装済み。

次に`convertToPng`を追加する場合、入力形式ごとに最適な変換経路が異なる。特にDraw.ioは、直接PNG/JPEGへ出すと数式が描画されない問題があるため、PDFを経由する必要がある。

## 決めたこと

### 対象入力

`convertToPng`の対象入力は以下にする。

- PDF
- SVG
- Mermaid
  - `.mmd`
  - `.mermaid`
- Draw.io
  - `.drawio`
  - `.dio`
  - `.drawio.png`
  - `.dio.png`
  - `.drawio.svg`
  - `.dio.svg`
- JPEG
  - `.jpg`
  - `.jpeg`
- WebP
- AVIF

PNG入力は同じ形式への変換になるため非対応入力として扱う。

### 変換経路

基本方針は「最短の経路を使う」。

ただしDraw.ioは例外とし、必ずPDFを経由する。

| 入力    | PNGへの変換経路          | 理由                                                  |
| ------- | ------------------------ | ----------------------------------------------------- |
| PDF     | PDF → PNG                | ページごとにPNGを作る                                 |
| SVG     | SVG → PNG                | 最短経路                                              |
| Mermaid | Mermaid CLIで直接PNG出力 | Mermaid CLIがPNGを直接出せる                          |
| Draw.io | Draw.io → PDF → PNG      | Draw.ioから直接PNG/JPEGへ出すと数式が描画されないため |
| JPEG    | JPEG → PNG               | 最短経路                                              |
| WebP    | WebP → PNG               | 最短経路                                              |
| AVIF    | AVIF → PNG               | 最短経路                                              |

### PDF入力のページ扱い

PDFはページごとにPNGを出力する。

- 1ページPDFでも`page`変数を使える
- 複数ページPDFはページ数分のPNGを作る
- 出力パスが同じ変換内で重複する場合は、出力反映前に全体停止する

### Draw.io入力のページ扱い

Draw.ioはまずPDFへ変換し、そのPDFをPNGへ変換する。

- `.drawio` / `.dio`の複数ページは、ページごとにPNGを作る
- editable Draw.io画像は、Draw.io CLIでPDFへ変換してからPNGへ変換する
- Draw.io CLIへ直接PNG/JPEG出力を要求しない

### Safe Mode / Undo / progress / cancellation

既存変換と同じ扱いにする。

- `.latex-graphics-helper/`内で作業ファイルを作る
- すべての変換が成功してから出力先へ反映する
- 失敗時は全体停止する
- Safe Modeの競合確認はバッチ全体で1回だけ行う
- Undoは直前の変換バッチ全体を対象にする
- `withProgress`を表示し、キャンセル可能にする

### 出力パス

既存のペア別設定を使う。

- PDF → PNG: `latex-graphics-helper.outputPath.convertPdfToPng`
- Draw.io → PNG: `latex-graphics-helper.outputPath.convertDrawioToPng`
- Mermaid → PNG: `latex-graphics-helper.outputPath.convertMermaidToPng`
- SVG → PNG: `latex-graphics-helper.outputPath.convertSvgToPng`
- JPEG → PNG: `latex-graphics-helper.outputPath.convertJpegToPng`
- WebP → PNG: `latex-graphics-helper.outputPath.convertWebpToPng`
- AVIF → PNG: `latex-graphics-helper.outputPath.convertAvifToPng`

出力形式基準の`outputPath.convertToPng`はこのタスクでは追加しない。

### テスト方針

画像内容の完全一致は行わない。

PNG出力は以下を確認する。

- ファイルが存在する
- PNGとして読み取れる
- 幅と高さが0より大きい
- 入力サイズが明確なものは、出力サイズが明らかにおかしくない

理由:

- Mermaid CLI / Chromium / font rendering / OS差でpixel完全一致は揺れやすい
- 初期実装では、壊れていないPNGとして出力できることを優先する

## 実装順

次のタスクに分ける。

1. `0064: convertToPngの失敗テストを追加する`
2. `0065: convertToPngを実装する`

0064では、まず対象入力のうち代表ケースを失敗テストにする。

優先度:

1. Mermaid → PNG
2. JPEG/WebP/AVIF → PNG
3. SVG → PNG
4. PDF → PNG
5. Draw.io → PDF → PNG

Draw.ioはPDF経由の仕様が重要なので、直接PNG出力しないことをテストで表現する。

## 変更可能なファイル

- `docs/tasks/0063-design-convert-to-png.md`
- `docs/tasks/README.md`
- `docs/specs/output-format-conversion.md`

## 対象外

- `convertToPng`の実装
- 失敗テスト追加
- package.jsonのcontext menu変更

## 確認方法

- 仕様と分割方針をユーザーが確認する
