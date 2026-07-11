# PDF operation fixtures

## 由来

2026-07-10にrepository ownerからテスト用として提供されたファイル。

ファイル名、PDF内容、ページサイズ、crop結果をfixtureの正本として扱う。

## ファイル名

次の要素は意図的に含まれているため、コピー時やテスト時に正規化しない。

- ` 薔薇🌹...`の先頭空白
- 日本語
- 絵文字
- `q a...`と`a a...`の通常空白

`outputPath`のテストではfixture自体の名前を変更せず、一時workspaceへ次の名前でコピーする。

`　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.pdf`

この名前は、先頭の全角空白、途中の半角空白、複数言語の文字、絵文字、全角英数字、Unicode記号を同時に検証するためのもの。先頭半角空白はWindowsで削除される可能性があるため、Windowsの失敗テストで扱う。

## 対応関係

### ` 薔薇🌹`セット

- ` 薔薇🌹.dio`: Draw.io原本
- ` 薔薇🌹.pdf`: 3ページの元PDF
- ` 薔薇🌹-1.pdf`から` 薔薇🌹-3.pdf`: 元PDFをページごとに分けたPDF
- ` 薔薇🌹-crop.pdf`: 3ページをcropしたPDF
- ` 薔薇🌹-1-crop.pdf`から` 薔薇🌹-3-crop.pdf`: 各ページをcropしたPDF

### 空白を含むASCII名セット

- `q a.drawio`: Draw.io原本
- `q a.pdf`: 2ページの元PDF
- `a a-1.pdf`と`a a-2.pdf`: `q a.pdf`の各ページと同じ内容を持つPDF
- `q a-crop.pdf`: 2ページをcropしたPDF
- `a a-1-crop.pdf`と`a a-2-crop.pdf`: 各ページをcropしたPDF

`q a`と`a a`の違いはoutputPathで元ファイルと異なる名前を指定するテストに使う。

## 運用

- テストはfixtureを直接変更せず、一時workspaceへコピーして使う。
- PDFの内容変更や再生成を行った場合は、crop前後の対応関係と画像比較結果を確認する。
- Draw.io原本はfixtureの由来を残すために含めている。`cropPdf.configure`のテスト入力にはPDFだけを使う。
