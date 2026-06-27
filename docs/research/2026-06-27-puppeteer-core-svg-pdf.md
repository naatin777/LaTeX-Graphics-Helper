# puppeteer-coreでSVGをPDFへ変換するための調査

## 調査日

2026-06-27

## 対象version

- `puppeteer-core`: 25.2.1

## 公式情報源

- Puppeteer README: `node_modules/puppeteer-core/README.md`
- Puppeteer API型定義: `node_modules/puppeteer-core/src/node/LaunchOptions.ts`
- Puppeteer Chrome launcher実装: `node_modules/puppeteer-core/src/node/ChromeLauncher.ts`

## 確認できた事実

- `puppeteer-core`はブラウザを同梱・ダウンロードしないライブラリとして提供される。
- `LaunchOptions.channel`を指定すると、Puppeteerは既知のシステム上のChromeインストール場所を探す。
- `LaunchOptions.executablePath`を指定すると、任意のブラウザ実行ファイルを使える。
- `ChromeReleaseChannel`として型定義されている値は`chrome`、`chrome-beta`、`chrome-canary`、`chrome-dev`。
- PuppeteerのPDF出力サイズ指定は内部変換でわずかに丸められるため、厳密なページサイズは生成後にPDFを補正する必要がある。

## 採用判断

- SVG→PDFの既定engineは`puppeteer`にする。
- `rsvg-convert`も設定で選べるように残す。
- Puppeteerのブラウザ選択は、`browserChannel`を通常設定、`executablePath`を明示上書き設定にする。
- SVG内の外部参照やJavaScriptは初期実装では読み込ませない。

## 未確認事項

- Chrome以外のChromium系ブラウザをPuppeteerの`channel`指定でどこまで安定検出できるか。
- SVG内の外部画像やWebフォントを再現する必要があるか。

## 再確認条件

- `puppeteer-core`のmajor versionを更新する場合
- EdgeなどChrome以外のブラウザchannelを正式対応する場合
- SVG内の外部参照をサポートする場合
