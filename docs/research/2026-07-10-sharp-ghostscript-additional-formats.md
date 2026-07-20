# sharpとGhostscriptの追加形式予備調査

## 再調査（2026-07-20）

### 現行version

- package manifest: `sharp` `^0.35.3`
- local installed sharp: `0.35.3`
- local bundled libvips: `8.18.3`
- local Ghostscript: `10.07.1`
- Windows CI: Ghostscript `gs10071`を固定して取得する。
- Linux / macOS CI: package managerからGhostscriptを取得するため、versionはworkflowで固定されていない。

### macOS arm64の`sharp.format`

| Format      | Input             | Output            | 判定               |
| ----------- | ----------------- | ----------------- | ------------------ |
| GIF         | enabled           | enabled           | 追加評価候補       |
| TIFF        | enabled           | enabled           | 追加評価候補       |
| HEIF / AVIF | enabled (`.avif`) | enabled (`.avif`) | HEIC defaultは保留 |
| JP2         | disabled          | disabled          | 対象外             |
| JPEG XL     | disabled          | disabled          | 対象外             |

GIFとTIFFは、2x2の生成画像をencodeし、同じsharpでdecodeできることを確認した。これはmacOS arm64のlocal Evidenceであり、3 OS共通のsupported判定ではない。

### EPSのlocal smoke

Ghostscript `10.07.1`へ最小EPSをstdinで渡し、`-dSAFER -dEPSCrop -sDEVICE=pdfwrite`で処理が成功することを確認した。これはCLIの最小parse / conversion確認であり、BoundingBox、font、vector保持、resource制限のEvidenceではない。

### Current conclusion

- 作業treeではGIF/TIFFを既存のPDF/PNG/JPEG/WebP/AVIF commandの入力として扱うprototypeを実装した。GIF/TIFFは先頭page/frameだけを使う。
- EPSのlocal smokeはGhostscriptの最小parse確認に留まり、product supportや安全性のEvidenceではないため、このPRから外した。
- GIF/TIFFのsupported昇格は、animated/multi-page fixture、5 output経路、3 OS CI、PR reviewの完了後に確定する。
- Packaged Electron Playwrightは既存packaged VSIXの回帰Evidenceであり、GIF/TIFFの実機能Evidenceではない。

### Remote evidence

- Check: https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29719192043
- Test: https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29719192017
- Packaged Electron Playwright regression: https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29719192024
- HEIF / HEIC、JP2、JPEG XL、BMP、ICOは現時点でdefault対応にしない。

### Current sources

- https://sharp.pixelplumbing.com/docs/api-utility/
- https://sharp.pixelplumbing.com/docs/api-constructor/
- https://sharp.pixelplumbing.com/docs/api-output/
- https://ghostscript.readthedocs.io/en/latest/Use.html
- https://ghostscript.readthedocs.io/en/latest/VectorDevices.html

以下は初回調査の記録である。

## 調査日

2026-07-10

## 対象

- sharp 0.34.5
- sharpのprebuilt libvips
- Ghostscript 10系
- GIF、TIFF、HEIF / HEIC、EPS

## 公式情報源

- https://sharp.pixelplumbing.com/
- https://sharp.pixelplumbing.com/install/
- https://sharp.pixelplumbing.com/api-constructor/
- https://sharp.pixelplumbing.com/api-input/
- https://sharp.pixelplumbing.com/api-output/
- https://ghostscript.readthedocs.io/en/latest/Use.html
- https://ghostscript.readthedocs.io/en/latest/VectorDevices.html

## 確認できた事実

### sharp

- sharpはJPEG、PNG、WebP、GIF、AVIF、TIFF、SVGをinputとして明記している。
- sharpはJPEG、PNG、WebP、GIF、AVIF、TIFFをoutputとして明記している。
- SVG inputを明示的なoutput指定なしでbufferへ出す場合はPNGになる。
- `metadata()`はheaderからmetadataを読む高速な処理で、圧縮pixel data全体をdecodeしない。
- untrusted inputではconstructorの`failOn`既定値`warning`を使うことが推奨されている。
- animated imageの複数page / frameを読む場合、sharpはpageを縦に連結した画像として扱い、`pageHeight`と`pages`を返す。
- HEICのHEVC compression対応には、libheif、libde265、x265対応でcompileしたglobal libvipsが必要である。
- sharpの対応能力はlibvips buildに依存するため、documentation上のAPIだけでなく採用環境の`sharp.format`確認が必要である。

### GhostscriptとEPS

- GhostscriptはPostScript、EPS、DOS EPS、PDFをinterpretできる。
- `pdfwrite` deviceはPDFをoutputする。
- `-dEPSCrop`はEPSのBoundingBoxへcropするためのoptionである。
- EPSはDocument Structuring Conventionsへ準拠し、`%%BoundingBox`をheaderに持つ必要がある。
- EPSは0または1 pageで、import先documentを妨げるPostScript commandを使わないことが期待される。
- Ghostscriptのhigh-level vector outputは見た目を可能な限り保持するが、入力構造がそのまま保持される保証はなく、内容によってrasterizeされる場合がある。

## 現時点の見立て

- GIFとTIFFはsharp prebuiltの共通対応候補として優先的に評価できる。
- GIFとTIFFは複数pageを持てるため、単純に拡張子を追加するだけでは不十分である。
- HEIF / HEICはユーザー環境のglobal libvipsへ依存させると再現性が下がるため、default対応には慎重であるべき。
- EPSはGhostscriptで一度PDFへ変換すると既存pipelineを再利用しやすい。
- EPSはprogramとして実行されるPostScript系入力なので、通常画像より厳しいsecurityとresource制限が必要になる。
- JP2やJPEG XLはAPIの存在だけで採用せず、sharp prebuilt binaryの3 OS実体確認後に判断する。
- 追加形式は1形式ずつ評価し、GitHub Actionsの3 OSで安定しない場合は実装を中止または保留する。
- CI成功のためにplatform別の機能差を隠さず、supported形式は3 OS共通の範囲を基本にする。

## 未確認事項

- sharp 0.34.5のprebuilt binaryでOSごとに有効な`sharp.format`の実値
- animated GIFとmulti-page TIFFのframe delay、loop、page metadata保持
- GIF / TIFFをPDFへ変換するときの最適なpage mapping
- TIFFのCMYK、16bit、float、compression別の互換性
- EPSからPDFへのfont、spot color、transparency、overprint、vector保持
- EPSに不正または欠落したBoundingBoxがある場合の扱い
- Ghostscript実行時のtime、memory、disk上限
- PS形式もEPSと同時に対応する価値があるか

## 再確認条件

- 追加形式仕様タスクへ着手するとき
- sharpまたはGhostscriptをupdateするとき
- sharpのglobal libvips利用を検討するとき
- HEIF / HEIC、JP2、JPEG XLの対応要望が来たとき

## 関連

- `docs/tasks/0129-design-additional-image-and-eps-formats.md`
- `docs/tasks/0128-design-input-preflight-validation.md`
- `docs/specs/internal/output-format-conversion.md`
