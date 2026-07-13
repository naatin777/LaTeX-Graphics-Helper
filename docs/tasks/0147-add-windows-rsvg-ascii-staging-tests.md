# タスク: Windows rsvg-convert用ASCII stagingの失敗テストを追加する

## Status

Done

## 目的

Windows rsvg-convertへASCII入出力pathだけを渡し、0 byte出力や別名出力を成功扱いしない仕様の失敗テストを追加する。

## 完了条件

- Unicode入力と出力をASCII名へmappingすることを確認する
- exit 0でも0 byteなら失敗にすることを確認する
- 別名出力を期待出力として扱わないことを確認する
- 実装fileを変更しない

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0147-add-windows-rsvg-ascii-staging-tests.md`

## 対象外

- staging実装
- Puppeteer engineの変更
- Ghostscriptとpdftocairoの変更

## テスト計画

- 固定SVG fixtureを多言語・絵文字・全角空白を含む論理入力pathへcopyする
- 固定PDF fixtureをrsvg-convert相当runnerの出力として使い、実ファイル読み込み経路とPDF妥当性を確認する
- Windows platformとASCII scratch base候補をoperationへ注入する
- rsvg-convert相当runnerをmockし、tool入力が`input.svg`、出力が`output.pdf`になることを確認する
- 入出力pathがASCIIかつscratch base内で、workspace外の論理pathを直接toolへ渡さないことを確認する
- 正常終了後に論理出力へPDFを反映し、scratchを削除することを確認する
- 期待pathと異なる別名PDF、期待pathの0 byte PDFを成功扱いせず、論理出力へ反映しないことを確認する
- Puppeteer engine、pdftocairo、Ghostscript、Draw.io、Safe Modeの選択肢、UI操作は対象外とする

## 実装前に固定する注入契約

- `convertPngToPdfFiles`へ`platform`と`scratchBaseCandidates`を注入できること
- `SvgToPdfOptions`へrsvg-convert runnerを注入できること
- runnerは実行fileと引数配列を受け取り、shell文字列を受け取らないこと

## 関連

- [ASCII staging仕様](0142-design-ascii-staging-for-external-tools.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)

## 確認方法

- 追加した失敗テスト
- `CI=true pnpm run check:all`

## 確認結果

- `CI=true pnpm run check:all` は既存warningのみで成功した
- `CI=true pnpm run compile && CI=true pnpm run compile:test` は成功した
- `.vscode-test.mjs`経由の`Windows rsvg-convert ASCII scratch`は3件失敗した
- 失敗理由は、現行実装が注入runnerを使わず、Windows ASCII stagingも実装していないためである
- 実装は変更していない。次の0148でこの3件を通す
