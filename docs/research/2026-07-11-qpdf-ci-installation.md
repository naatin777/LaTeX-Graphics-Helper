# qpdfのCI導入調査

## 調査日

2026-07-11

## 対象

- qpdf 12.3.2
- Ubuntu package
- Homebrew formula
- qpdf公式Windows x64配布物

## 公式情報源

- [qpdf公式リリース](https://github.com/qpdf/qpdf/releases/tag/v12.3.2)
- [qpdf installation documentation](https://qpdf.readthedocs.io/en/stable/installation.html)
- [Ubuntu package search: qpdf](https://packages.ubuntu.com/search?keywords=qpdf)
- [Homebrew Formulae: qpdf](https://formulae.brew.sh/formula/qpdf)

## 確認できた事実

- 手元のmacOSではHomebrewにより`/opt/homebrew/bin/qpdf`へqpdf 12.3.2が導入されている
- Ubuntuには`qpdf`というpackageがあり、GitHub ActionsのUbuntu runnerで`apt-get install qpdf`を利用できる
- Homebrewでは`brew install qpdf`を利用でき、調査時点のstableは12.3.2である
- qpdf 12.3.2の公式releaseには`qpdf-12.3.2-msvc64.zip`がある
- 公式release記載のSHA-256は`8941870a604e7c87ed24566b038d46c24ce76616254d2383c578f60c0677f202`である
- 実際に取得したZIPのSHA-256は公式記載と一致し、`qpdf-12.3.2-msvc64/bin/qpdf.exe`と必要なDLLを含んでいた

## 採用するCI導入方法

- LinuxはrunnerのUbuntu packageを使う
- macOSはHomebrew formulaを使う
- Windowsはqpdf公式の12.3.2 msvc64 ZIPを固定URLから取得し、展開前にSHA-256を検証する
- 導入確認では、3 OSすべてで実体の`qpdf --version`を実行する
- extensionはまだqpdfを使わないため、`latex-graphics-helper.execPath.qpdf`は追加しない

## 未確認事項

- 各runnerで導入されるqpdfのversionが、将来のPDF処理要件を満たすか
- qpdfをextensionから実行する場合の設定名とfallback方針
- Unicode、絵文字、空白、path separatorを含む入出力pathのOS別実測結果

## 再確認条件

- qpdfを製品機能から呼び出す場合
- Windows配布物のversionを更新する場合
- GitHub Actions runner imageまたはpackage managerを変更する場合
- qpdfをPDFのpreflightまたは変換backendとして採用する場合

## 関連

- [GitHub Actionsの3 OSへqpdfを導入する](../tasks/0140-install-qpdf-in-ci.md)
- [外部コマンドのOS別path互換性を実測する](../tasks/0141-audit-external-tool-path-compatibility.md)
