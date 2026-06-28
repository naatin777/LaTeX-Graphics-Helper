# Mermaid CLI調査メモ

## 調査日

2026-06-28

## 対象

- `@mermaid-js/mermaid-cli`
- Mermaid CLI README

## 公式情報源

- https://github.com/mermaid-js/mermaid-cli/blob/master/README.md

## 確認できた事実

- Mermaid CLIは、Mermaid定義ファイルを入力として受け取り、SVG、PNG、PDFを出力できる。
- 基本コマンドは`mmdc -i input.mmd -o output.svg`の形である。
- ローカルinstallは`npm install @mermaid-js/mermaid-cli`で可能。
- ローカルinstall後は`./node_modules/.bin/mmdc`を呼べる。
- Node.js APIとして`@mermaid-js/mermaid-cli`から`run`をimportして呼ぶ方法がREADMEに記載されている。
- Node.js APIはsemverで保証されない旨がREADMEに記載されている。
- テーマや背景色はCLI optionで指定できる。
  - 例: `-t dark`
  - 例: `-b transparent`
- CSSやconfig fileを使ったカスタムも可能。
- READMEにはknown issuesとしてLinux sandbox issueや、既存Chromium利用設定に関する項目がある。
- `mmdc`は`-p --puppeteerConfigFile`でPuppeteer launch optionのJSONを受け取れる。
- Node.js APIの`run`は`puppeteerConfig` optionでPuppeteer launch optionを受け取れる。
- `channel: "chrome"`を指定すると、Puppeteer管理ブラウザではなくユーザー環境のChromeを使える。
- Windowsでは`.cmd`を`execFile`で直接起動するとOS差が出やすい。

## 実装判断への影響

- 初期実装では、`@mermaid-js/mermaid-cli`の`run` APIを使う。
  - 理由: READMEに記載された利用方法であり、package内部の`src/cli.js`や`.bin/mmdc`を独自に解決するより実装が単純になるため。
  - 注意: README上でNode.js APIはsemver保証対象外とされているため、major/minor update時はテストで実挙動を確認する。
- `@mermaid-js/mermaid-cli`はdependencyとして追加する。
- Puppeteer管理Chromeのinstallは前提にしない。
- 初期実装ではPuppeteer configとして`channel: "chrome"`を渡し、必要なら`settings.json`で`executablePath`を指定できるようにする。
- `mmdc.cmd`、`.bin/mmdc`、dependency内部のCLI JavaScriptは直接起動しない。
- 初期実装ではMermaid CLIのデフォルト設定を使う。
- テーマ、背景色、CSS、config fileは将来拡張候補として扱う。

## 未確認事項

- VS Code extension packageに含めた場合のサイズ影響。
- CI上でMermaid CLIのChromium実行が安定するか。
- Windows/macOS/Linuxで同じfixtureから安定したSVG/PNG/PDFが生成できるか。

## 再確認条件

- `@mermaid-js/mermaid-cli`のmajor versionを更新する場合。
- Node.js APIの引数仕様やsemver保証状況が変わった場合。
- Chrome検出、Chromium download、extension package sizeが問題になった場合。
- Mermaidのtheme/configをsettings化する場合。
