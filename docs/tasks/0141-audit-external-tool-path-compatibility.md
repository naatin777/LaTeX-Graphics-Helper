# タスク: 外部コマンドのOS別path互換性を実測する

## Status

Todo

## 目的

extensionが利用する外部コマンドについて、多言語文字、絵文字、空白、path separatorなどの互換性をLinux、macOS、Windowsの実体で確認し、推測ではなく実測結果を残す。

## 完了条件

- extension commandと、それが利用する外部コマンドの対応表を作る
- Ghostscript、pdftocairo、rsvg-convert、Draw.io CLI、pdfcrop、qpdfを調査対象として整理する
- 入力file、出力file、入力directory、出力directoryを分けて確認する
- 日本語だけでなく、複数言語、結合文字、絵文字、半角空白、全角空白を含むfixture名を確認する
- Windowsの`\\`と`/`、POSIXの`/`、drive letterなどOS固有のpath表現を確認する
- 3 OSのGitHub Actionsで各コマンドの実体を使ったprobeを実行する
- 成功、失敗、未確認を区別した調査メモを`docs/research/`へ残す
- 製品実装は変更せず、対応が必要なコマンドごとに後続タスクを作る

## 変更可能なファイル

- `docs/tasks/README.md`
- `docs/tasks/0141-audit-external-tool-path-compatibility.md`
- `docs/research/`
- 調査用のGitHub Actions workflowとscript
- 調査用fixture

## 対象外

- ASCII stagingの製品実装
- すべての外部コマンドを一括で修正すること
- 失敗を避けるために製品fixture名を単純化すること
- CIで導入できないツールを推測だけで対応済みにすること

## 関連

- [Windows Poppler用にASCIIの画像比較ディレクトリを使う](0139-use-ascii-render-directory-for-windows-poppler.md)
- [外部コマンド用ASCII stagingの仕様を決める](0142-design-ascii-staging-for-external-tools.md)

## 確認方法

- Linux、macOS、Windowsの調査job結果
- `docs/research/`の調査表と実行commandを照合する
