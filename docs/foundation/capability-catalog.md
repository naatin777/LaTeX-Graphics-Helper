# v1 capability catalog

- 対象baseline: `next/v1`を取り込んだ`audit/v1-foundation`
- 状態: 監査用draft
- 正本: この文書は正式仕様ではない。利用者向けcontractは`docs/specs/`、採用判断は`docs/adr/`へ移す。
- Evidence状態:
  - `confirmed`: manifest、実装、spec、testのいずれかを直接確認した
  - `partial`: capabilityは確認したが、contractまたはtest traceが不足する
  - `unknown`: 現時点の監査で判断できない

## 1. Public user capabilities

| ID | Capability / public entry | Input | User-visible output | External dependency | Safety / cancellation / Undo | Primary records | Observed Evidence | State / gap |
|---|---|---|---|---|---|---|---|---|
| CAP-PDF-001 | Quick PDF crop `cropPdf.auto` | workspace内のPDF | margin候補で全ページをcropしたPDF | Ghostscript | staged commit、Safe Mode、Undo、progress/cancelの対象として文書化 | `README.ja.md`, `safe-mode.md`, `conversion-progress-and-cancellation.md` | 共通commit / cleanup / Undo test | `partial`: 専用command / operation testの完全inventoryが未完了 |
| CAP-PDF-002 | Configure PDF crop `cropPdf.configure` | workspace内の単一PDF | Webviewで指定したbboxを適用した1 PDF | PDF.jsはWebview表示、crop保存は`pdf-lib` | Apply後はprogress/cancel、Safe Mode、Undo。Webview表示中はprogress対象外 | `crop-pdf-configure.md`, `file-operation-security.md` | `crop_pdf_configure_operation.test.ts`, Browser Playwright, Electron journey | `confirmed`: specは詳細。Browser / Electron間のoracle重複整理が必要 |
| CAP-PDF-003 | Split all pages `splitPdf.allPages` | workspace内のPDF | ページごとの単一ページPDF | 不要 | staged commit、Safe Mode、Undo、progress/cancel | `README.ja.md`, `safe-mode.md`, `undo-last-conversion.md`, `conversion-progress-and-cancellation.md` | 共通commit / cleanup / Undo test | `partial`: 専用testと現行spec対象一覧の完全照合が未完了 |
| CAP-PDF-004 | Merge selected PDFs `mergePdf.selectedFiles` | workspace内の複数PDF | 選択順で結合した1 PDF | 不要 | staged commit、Safe Mode、Undo、cancel | `README.ja.md`, `safe-mode.md`, `undo-last-conversion.md` | `merge_pdf_operation.test.ts`, `merge_pdf_command.test.ts` | `confirmed`: command testはvisual outputまで確認。専用利用者仕様は見つかっていない |
| CAP-CONV-001 | Convert to PDF `convertToPdf` | PNG/JPEG/WebP/AVIF/SVG/Mermaid/editable Draw.io image | 入力ごとのPDF | rasterはprocess内、SVGはChrome/Puppeteerまたは`rsvg-convert`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo。最終出力はstaged commit | `README.ja.md`, `file-operation-security.md`, `external-tool-ascii-scratch.md` | `convert_png_to_pdf.test.ts`, `convert_to_pdf_command.test.ts`, `convert_to_pdf_drawio_path.test.ts` | `partial`: capability横断の正式conversion specがない |
| CAP-CONV-002 | Convert to PNG `convertToPng` | PDF/JPEG/WebP/AVIF/SVG/Mermaid/editable Draw.io image | 入力またはPDF pageごとのPNG | PDFは`pdftocairo`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo、staged commit | `README.ja.md`, `external-tool-ascii-scratch.md` | command wiring、共通staged batch / commit test | `partial`: 専用test一覧とsource別contractのtraceが未完了 |
| CAP-CONV-003 | Convert to JPEG `convertToJpeg` | PDF/PNG/WebP/AVIF/SVG/Mermaid/editable Draw.io image | 入力またはPDF pageごとのJPEG | PDFは`pdftocairo`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo、staged commit | `README.ja.md`, `external-tool-ascii-scratch.md`, packaging spec | packaged VSIX smokeでPNG→JPEGとSharp loadを確認 | `partial`:通常source別test traceが未完了 |
| CAP-CONV-004 | Convert to WebP `convertToWebp` | PDF/PNG/JPEG/AVIF/SVG/Mermaid/editable Draw.io image | 入力またはPDF pageごとのWebP | PDFは`pdftocairo`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo、staged commit | `README.ja.md`, `external-tool-ascii-scratch.md` | shared message test、共通transaction test | `partial`: effort設定を含む専用contract / test traceが未完了 |
| CAP-CONV-005 | Convert to AVIF `convertToAvif` | PDF/PNG/JPEG/WebP/SVG/Mermaid/editable Draw.io image | 入力またはPDF pageごとのAVIF | PDFは`pdftocairo`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo、staged commit | `README.ja.md`, `external-tool-ascii-scratch.md` | `convertToPdf`側ではAVIF入力を実変換。AVIF出力の専用traceは未完了 | `partial`: effort設定・platform/native codec Evidenceの整理が必要 |
| CAP-CONV-006 | Convert to SVG `convertToSvg` | PDF/Mermaid/editable Draw.io image | 入力またはPDF pageごとのSVG | PDFは`pdftocairo`、MermaidはChrome、Draw.ioはDesktop CLI | `runOutputConversion`経由のprogress/cancel/Undo、staged commit | `README.ja.md`, `external-tool-ascii-scratch.md` | command / manifest registration、共通transaction test | `partial`: 専用output correctness testのtraceが未完了 |
| CAP-LATEX-001 | PDF drag and drop to LaTeX | local PDF URI-list | `figure` / `includegraphics` snippet | 不要 | file書き込みなし。CancellationTokenでprovider辞退 | `latex-insertion.md` | `latex_drop_edit_provider.test.ts` | `confirmed`: workspace外local PDFをrelative pathで許可する点はfile operation境界と異なる |
| CAP-LATEX-002 | Clipboard image paste to LaTeX | PNG/JPEG clipboard data | imageまたはPDF file + LaTeX snippet | PDF保存はprocess内。選択形式により変換処理を使用 | staged commit、Safe Mode、Undo、CancellationToken、cleanup ownership | `latex-insertion.md`, `conversion-progress-and-cancellation.md`, `file-operation-security.md` | `save_clipboard_image.test.ts`, `latex_paste_edit_provider.test.ts` | `confirmed`: operationとHost integrationの両層がある。1 provider testへの責務集中は整理候補 |

## 2. Cross-cutting guarantees

| ID | Guarantee | Scope | Confirmed contract | Observed Evidence | Gap |
|---|---|---|---|---|---|
| CAP-SAFE-001 | Workspace boundary | user file read/write、transaction staging、backup | logical path + realpath、symlink拒否、workspace自体がsymlinkの場合の境界 | cleanup、Undo、commit、operation testのworkspace外 / symlinkケース | commandごとの適用traceが一箇所にない |
| CAP-SAFE-002 | Safe Mode conflict policy | user-visible final outputs | Keep Both / Do Not Overwrite / Overwrite、batchで判断1回、OFFでもbackup | `commit_conversion_outputs.test.ts`, merge / paste test | `safe-mode.md`の「初期対象」が現在のgeneric conversion commandを列挙していない |
| CAP-SAFE-003 | Commit and rollback | staged outputからfinal outputへの反映 | overwrite backup、partial rollback、rollback failure保持、output change detection | `commit_conversion_outputs.test.ts`, `save_clipboard_image.test.ts` | Undo自体の途中失敗は自動rollback対象外であることをrelease riskとして明示する必要がある |
| CAP-SAFE-004 | Artifact cleanup | operation root単位 | current operationだけcleanupし、別session・unknown directory・symlink先を削除しない | `cleanup_conversion_artifacts.test.ts`, `run_staged_conversion_batch.test.ts` | crash残骸のmanual recovery guideがない |
| CAP-SAFE-005 | Cancellation | command / provider / external process | cancel後に新しいfinal commitを開始しない。実行中tool終了、待機job開始禁止 | shared command runner、commit cancel test、merge / paste test | `conversion-progress-and-cancellation.md`の「対応済み」一覧が現行command全体と同期していない |
| CAP-SAFE-006 | Undo last conversion | 最後に成功した1 operation | hash一致とworkspace境界を全件検証後にdelete / restore。再起動後は復元しない | `undo_last_conversion.test.ts`, merge / paste integration | `undo-last-conversion.md`の対象一覧がgeneric conversion commandを列挙していない |
| CAP-DIAG-001 | Progress / notification / Output Channel | command、external tool、commit、cleanup | command層でprogress、operationへAbortSignal、diagnosticはOutput Channel | `run_output_conversion.ts`, `run_external_tool.test.ts`, command tests | 利用者向けnotificationと診断logの責務一覧がない |

## 3. Delivery capability

| ID | Capability | Contract | Evidence | Gap |
|---|---|---|---|---|
| CAP-REL-001 | Reproducible VSIX packaging | lockfileからproduction dependencyをdeployし、runnerと異なるtargetをcross-compileしない | `packaging.md`, `package-vsix.mjs`, release workflow | package script単体のNode test inventoryが未完了 |
| CAP-REL-002 | Packaged VSIX smoke | installed VSIXでCrop ConfigureとPNG→JPEGを実行し、Sharp native dependencyをloadする | release workflowのLinux/macOS/Windows matrix、Electron packaged mode | release前PRでは3 OS packaged smokeを毎回実行しない |
| CAP-REL-003 | Marketplace / Open VSX publish | 全target package成功後にpublish | release workflow | token、registry側受理、rollbackはrepository testの対象外 |

## 4. Current contradictions found by the catalog

1. `safe-mode.md`と`undo-last-conversion.md`の対象一覧は、READMEと共通command runnerが示す現在のgeneric conversion command群を完全には列挙していない。
2. `conversion-progress-and-cancellation.md`の「対応済み」は一部commandだけで、現在のPNG/JPEG/WebP/AVIF/SVG共通runnerと同期していない。
3. Mergeにはcommand / operation Evidenceがあるが、利用者向け専用specを確認できていない。
4. ConversionはREADME、manifest、実装、testに分散しており、入力形式ごとの事前条件・出力保証・外部tool failureをまとめた正式specがない。
5. Capabilityが実装済みであることと、required platformで実行済みであることを区別する共通欄が既存specにない。

## 5. Next use

このcatalogを基に、次を人間が決める。

- v1 releaseでrequiredとするcapabilityとplatform
- capabilityごとの最小oracle
- staleな対象一覧を個別specで更新するか、共通capability specへ統合するか
- conversion source / output matrixを正式contractとしてどこへ置くか

採用後は、この文書を第二の仕様正本として維持せず、確定内容を`docs/specs/`と`docs/test-policy.md`へ移す。
