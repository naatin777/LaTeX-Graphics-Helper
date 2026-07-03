# タスク: v0.5.1からの破壊的変更を文書化する

## Status

Todo

## 目的

`v0.5.1` で公開されていた旧command IDと旧settingsについて、v1.0.0へ向けた破壊的変更としてREADME / CHANGELOG / migration noteに明記する。

旧command IDの互換aliasは実装しない。

## 完了条件

- 旧command IDの移行先を記録する
  - `latex-graphics-helper.cropPdf`
  - `latex-graphics-helper.splitPdf`
  - `latex-graphics-helper.mergePdf`
  - `latex-graphics-helper.convertDrawioToPdf`
  - `latex-graphics-helper.convertPdfToPng`
  - `latex-graphics-helper.convertPdfToJpeg`
  - `latex-graphics-helper.convertPdfToSvg`
  - `latex-graphics-helper.convertPngToPdf`
  - `latex-graphics-helper.convertJpegToPdf`
  - `latex-graphics-helper.convertSvgToPdf`
- 旧settingsの移行先または廃止理由を記録する
  - `latex-graphics-helper.execPath.pdfcrop`
  - `latex-graphics-helper.execPath.puppeteer`
  - `latex-graphics-helper.puppeteer.browser`
  - `latex-graphics-helper.puppeteer.channel`
- README / CHANGELOG / migration note に書く内容を決める
- legacy command aliasを実装しないことを明記する

## 変更可能なファイル

- `docs/specs/`
- `docs/adr/`
- `docs/tasks/0115-decide-v051-legacy-compatibility.md`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- テスト追加
- package.json変更
- legacy command aliasの追加

## 関連

- [0112: v0.5.1公開機能との差分を整理する](0112-track-v051-public-feature-parity.md)
- [0032: 変換コマンドを出力形式基準へ再設計する](0032-redesign-conversion-commands-by-output-format.md)
- [0089: 出力形式基準のoutputPath設定移行方針を決める](0089-design-output-format-output-path-settings.md)

## 確認方法

- 破壊的変更と移行先がADRまたはspecに記録されていることを確認する
