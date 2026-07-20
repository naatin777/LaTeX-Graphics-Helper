# タスク: 追加画像形式とEPS対応の仕様を決める

## Status

In Progress

## 再調査結果（2026-07-20）

- 現行依存は`sharp` `0.35.3`、同梱libvipsは`8.18.3`。旧調査の`sharp` `0.34.5`から更新されている。
- macOS arm64の実環境では、`sharp.format`でGIF/TIFFのinput・outputが有効だった。
- 同じ環境でJP2/JPEG XLはinput・outputとも無効だった。HEIFはAVIFのaliasとして有効だが、`.avif` suffixのみであり、HEICをdefault対応とする根拠にはしない。
- macOS arm64で2x2の生成画像をGIF/TIFFへencodeし、sharpでdecodeできることを確認した。
- GhostscriptはmacOSで`10.07.1`。最小EPSを`-dSAFER -dEPSCrop -sDEVICE=pdfwrite`で処理できた。
- `source_format.ts`と既存のPDF/PNG/JPEG/WebP/AVIF commandへGIF/TIFF/EPSの入力対応を追加し、GIF/TIFFは先頭page/frame、EPSはGhostscriptでPDFを経由するprototypeを実装した。
- Linux / Windowsを含む3 OSのExtension Hostで実fixture変換が成功した。CIのGhostscriptはLinux/macOSが未固定、Windowsは`gs10071`固定である。

### 今回の実装判断

- GIF/TIFFは既存の画像出力commandへの入力だけを対応し、先頭page/frameだけを処理する。animationやmulti-pageの展開は行わない。
- EPSは既存のPDF/PNG/JPEG/WebP/AVIF outputへ入力でき、Ghostscriptでstaged PDFを作って既存経路へ渡す。EPSの新規出力commandは追加しない。
- GIF/TIFFの出力commandとmulti-page展開は今回実装しない。
- HEIF/HEIC、JP2、JPEG XL、BMP、ICOはdefault対応候補から外す。

### 残りの確認

- Linux / Windowsの`sharp.format`と実fixture変換をCIで確認する。確認済み。
- GIF animation / multi-page TIFFを展開しない先頭page/frame仕様を3 OSで確認する。
- EPSのBoundingBox正常系・欠落・不正、vector / fontの変換結果、timeout・memory・disk制限を確認する。
- CI結果を確認してprototypeをsupportedへ昇格するか、見送るかをmaintainerが決定する。

### Remote Evidence

- [Check workflow run 29715915828](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29715915828)
- [Test workflow run 29715915852](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29715915852): Linux、macOS、Windows pass
- [Packaged Electron Playwright workflow run 29715915831](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29715915831): Linux、macOS、Windows pass

## 目的

現在対応しているPNG、JPEG、WebP、AVIF、SVGに加え、sharpが安定して扱える画像形式とGhostscriptで扱うEPSを、既存の出力形式基準commandへ安全に追加する仕様を決める。

## 完了条件

- 入力形式と出力形式を分けて対応範囲を決める
- sharp同梱のprebuilt libvipsで3 OS共通利用できる形式だけをdefault対応候補にする
- `sharp.format`をmacOS、Windows、Linux CIで確認する方法を決める
- GIF animationとmulti-page TIFFのpage / frame semanticsを決める
- GIF・TIFFからPDFへ変換するとき、1ファイルへまとめるかpageごとに出力するか決める
- GIF・TIFFからraster形式へ変換するとき、先頭pageだけか全pageか決める
- HEIF / HEICをdefault対応、条件付き対応、対象外のどれにするか決める
- EPSをGhostscriptでPDFへ変換し、他形式へは既存PDF変換経路を使う方針を検証する
- EPSのBoundingBox、単一page制約、font、color、vector保持を確認する
- EPS / PostScript入力のsecurityとpreflight方針を決める
- JP2、JPEG XL、BMP、ICOなど追加候補の採否を記録する
- context menu、複数選択、Safe Mode、Undo、progress、cancellation、outputPathの扱いを既存形式と揃える
- 形式ごとの実fixtureと変換後の画像比較テスト方針を決める
- dependencyまたは外部tool追加が必要な場合は、実装前にADRへ記録する
- 形式ごとにGitHub ActionsのmacOS、Windows、Linuxで実体変換を確認する
- 3 OSで安定しない形式を無理に対応せず、保留または対象外として理由を記録する

## 段階導入

追加形式を一括実装しない。1形式ごとに別タスクを作り、次の順序で進める。

1. 公式仕様と採用versionを調査する
2. 実fixtureを用意する
3. macOS、Windows、LinuxのGitHub Actionsでdecode・encodeまたは変換実体を確認する
4. page / frame、outputPath、metadata、errorの仕様を決める
5. 失敗テストを追加する
6. 最小実装を追加する
7. 画像内容、size、page / frame数を検証する
8. CIとreviewが通った形式だけをsupportedとして公開する

候補形式同士を同じ実装タスクへまとめない。GIF、TIFF、EPS、HEIF / HEICなどを個別に評価し、前の形式が完了してから次へ進む。

## 中止・保留条件

次のいずれかに当てはまる場合、その形式の対応を無理に続けない。

- GitHub Actionsの3 OSで同じ入力を安定して処理できない
- sharp prebuilt binaryでは利用できず、global libvipsの特殊buildを必須にする
- CIの外部tool installが不安定または過度に重い
- VS Code extension package sizeが大きく増える
- licenseまたはpatent上の懸念を解消できない
- security上、安全なresource制限やfile access制限を設けられない
- animation、multi-page、metadataなどの仕様を一貫して定義できない
- 保守されていないtoolやplatform固有toolへ依存する

中止した場合は、失敗したOS、採用version、実行command、error、再確認条件を`docs/research/`へ記録する。CIを通すためだけのskip、長い固定wait、緩すぎる画像比較許容値は追加しない。

## 初期候補

### default対応を優先して検討

- GIF input
- TIFF input
- GIF output
- TIFF output
- EPS input

### 条件付き対応を検討

- HEIF / HEIC
- JP2
- JPEG XL

### 追加理由があるまで保留

- libvips V format
- DZI
- raw pixel data
- BMP
- ICO

## EPS変換経路案

```text
EPS
 └─ Ghostscript pdfwrite + EPSCrop
     └─ PDF
         ├─ PDFとして出力
         ├─ pdftocairoでPNG / JPEG / SVGへ変換
         └─ sharpを使う既存経路でWebP / AVIFへ変換
```

EPSはPostScript programであるため、workspace内の安全な作業領域へコピーし、`-dSAFER`を付け、入力・出力pathを引数として渡す。実装前に、Ghostscriptのsecurity制約と許可するfile accessを改めて確認する。

## 変更可能なファイル

- `docs/research/`
- `docs/specs/`
- `docs/adr/`
- `docs/tasks/README.md`
- `docs/tasks/0129-design-additional-image-and-eps-formats.md`

## 対象外

- このタスク内でのdependency追加
- conversion commandの実装
- context menuの実装
- sharpのglobal libvipsへの切り替え
- Ghostscript binaryの同梱

## 関連

- [sharpとGhostscriptの追加形式予備調査](../research/2026-07-10-sharp-ghostscript-additional-formats.md)
- [出力形式基準の変換仕様](../specs/internal/output-format-conversion.md)
- [変換入力preflightタスク](0128-design-input-preflight-validation.md)
- [ファイル操作security仕様](../specs/internal/file-operation-security.md)

## 確認方法

- 採用sharp versionの`sharp.format`を3 OSで記録する
- 採用候補ごとに実fixtureをdecode・encodeできることを確認する
- EPSをGhostscriptでPDFへ変換し、BoundingBoxと描画内容を比較する
- 形式ごとのpage / frame semanticsが仕様へ明記されていることを確認する
- supportedとした形式はGitHub Actionsの3 OSすべてで実体変換が成功していることを確認する
