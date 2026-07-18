# v1 test runtime inventory

- 状態: 監査用draft
- 対象: `origin/next/v1` at `75ca52a`のlocal Git tree、test、runner config、package script、workflow
- 方法: `git ls-files`、test構文抽出、relative import graph、helper / fixture / snapshot列挙でrepository内を再確認した。
- 訂正: 以前の「GitHub connectorではdirectory treeを直接列挙できない」という注意書きは、この監査でlocal treeを正本に完全列挙したため無効である。

## 0. Complete inventory counts

詳細なfile単位表とcase indexは[test-file-inventory](test-file-inventory.md)にある。

| Scope                 |  Files |   Cases | Current execution                         |
| --------------------- | -----: | ------: | ----------------------------------------- |
| Root `test/*.test.ts` |     45 |     207 | configured VS Code Extension Host / Mocha |
| Webview component     |      3 |       4 | configured JSDOM / Vitest                 |
| Electron Playwright   |      1 |       1 | configured VS Code Electron               |
| **Total**             | **49** | **212** | statically declared; Browser scope: 0     |

`test`、`test:webview`、`test:playwright:vsix`はruntimeごとに分離されている。actual executed countと3 OSの結果はGitHub Actionsで確認する。

## 1. Runtime definitions

| Runtime ID  | Runtime                        | Required when                                                                                                         | Not a reason by itself                                    |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| RT-NODE     | Node test runner / Vitest候補  | pure logic、Node filesystem、child process、PDF / image library、failure injection                                    | 現在`test/`に置かれていること                             |
| RT-VSCODE   | VS Code Extension Host / Mocha | `vscode` command registry、workspace、configuration、TextDocument、DataTransfer、globalState、notification / progress | production moduleが偶然`vscode`をtop-level importすること |
| RT-BROWSER  | Retired Browser Playwright     | 過去のChromium canvas、PDF.js worker、layout、DPI、IntersectionObserver、scrollの履歴                                 | 現行required runtimeではない                              |
| RT-ELECTRON | Real VS Code Electron          | VS Code window、actual Webview frame、theme CSS variables、Host message bridge、critical user journey                 | pure operationやpackage内部moduleの全組合せ               |
| RT-PACKAGE  | Installed VSIX smoke           | packaged artifact、native dependency、controlled external-fetch failure / installation / execution                    | development extension pathの動作                          |
| RT-PLATFORM | Native OS matrix               | path、shell、external process、native module、file lock等のOS差                                                       | 1 OSのsimulationだけ                                      |

## 2. Runner and script inventory

| Entry                  | Actual execution                                      | Platform / trigger                              | Meaning gap                                      |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `test`                 | `vscode-test`                                         | local / Test workflow 3 OS                      | fixed VS Code 1.105.0、build-free Host suite     |
| `test:webview`         | three app Vitest configs                              | local / Test workflow 3 OS                      | JSDOM component interaction、build-free          |
| `test:playwright:vsix` | Electron projectのみ                                  | local / Playwright workflow 3 OS / release 3 OS | required `LGH_VSIX_PATH`のinstalled VSIX journey |
| `check:all`            | lint / format / TS / NLS                              | Check workflow                                  | runtime testではない                             |
| Test workflow          | build + Host + JSDOM component test 3 OS              | PR / main push、docs-only skipなし              | pre-package runtime Evidenceを提供する           |
| Playwright workflow    | build + runner VSIX package + installed Electron 3 OS | PR / main push                                  | packaged artifact Evidenceを提供する             |
| Release workflow       | VSIX package / packaged Electron smoke 3 OS           | tag                                             | distribution Evidenceを提供する                  |
| Vitest config          | `test:webview`                                        | formal root scriptあり                          | PDF.js real renderingやElectronの証明には不十分  |

## 3. Tests whose contract is Node-level

### 3.1 P0: strong Node candidates

次は現在のtest/source/helper graphを確認した範囲で、直接・推移的に`vscode`を必要とせず、contract上もVS Code runtimeを必要としないNode-level候補である。移行を実施した結果ではない。

| Test file                                   | Contract / oracle                                      | Current runner | Recommended experiment | Notes                                                      |
| ------------------------------------------- | ------------------------------------------------------ | -------------- | ---------------------- | ---------------------------------------------------------- |
| `test/source_format.test.ts`                | extension / compound extension判定                     | RT-VSCODE      | RT-NODE                | pure synchronous logic                                     |
| `test/crop_pdf_protocol.test.ts`            | Webview message payload validation                     | RT-VSCODE      | RT-NODE                | browser / Host双方が共有するprotocol contract              |
| `test/file_content_hash.test.ts`            | streaming SHA-256 / content equality                   | RT-VSCODE      | RT-NODE                | Node filesystemだけを使用                                  |
| `test/run_staged_conversion_batch.test.ts`  | stage / commit / operation-root cleanup                | RT-VSCODE      | RT-NODE                | filesystem transaction test                                |
| `test/commit_conversion_outputs.test.ts`    | Keep Both、overwrite、rollback、cancel、race detection | RT-VSCODE      | RT-NODE                | safety-critical。runner移行時もfailure injectionを維持する |
| `test/cleanup_conversion_artifacts.test.ts` | preserve backup、symlink、別session保護                | RT-VSCODE      | RT-NODE                | safety-critical filesystem test                            |
| `test/resolve_output_path.test.ts`          | output template/path resolution                        | RT-VSCODE      | RT-NODE                | platform option is injected; no Host setting/helper        |
| `test/workspace_path.test.ts`               | workspace logical/realpath boundary                    | RT-VSCODE      | RT-NODE                | real filesystem and symlink oracle                         |
| `test/safe_mode.test.ts`                    | Safe Mode state and persistence adapter                | RT-VSCODE      | RT-NODE                | in-memory globalState fake; no VS Code graph               |

### 3.2 P1: Node experiment candidates

These are Node-level operation candidates, but native dependency、external process、platform simulation、またはfixture/harness調整の比較が必要である。

| Test file                                                                                                                                                                                                       | Why P1                                                          | Required experiment                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `test/run_external_tool.test.ts`                                                                                                                                                                                | real child process and redaction boundary                       | add a separate AbortSignal case; compare teardown and diagnostics on 3 OS             |
| `test/convert_png_to_pdf.test.ts`, `test/png_safe_mode.test.ts`                                                                                                                                                 | Sharp/native conversion and transaction safety                  | verify ABI, fixture path, timeout and failure injection on 3 OS                       |
| `test/convert_to_pdf_drawio_path.test.ts`, `test/convert_to_png_operation.test.ts`, `test/convert_to_svg_operation.test.ts`, `test/convert_to_avif_operation.test.ts`, `test/convert_to_webp_operation.test.ts` | injected external runner plus real PDF/image oracle             | preserve fake-runner failure semantics; separate CLI probe from operation contract    |
| `test/crop_pdf_auto.test.ts`                                                                                                                                                                                    | Ghostscript/process/cancellation and operation preflight        | compare tool injection, AbortSignal, platform setup, and command boundary             |
| `test/convert_pdftocairo_ascii_scratch.test.ts`, `test/convert_rsvg_ascii_scratch.test.ts`, `test/crop_pdf_ghostscript_ascii_scratch.test.ts`                                                                   | Windows scratch/platform safety                                 | keep simulation and real-tool probe separate; verify scratch fallback/symlink/cleanup |
| `test/save_clipboard_image.test.ts`                                                                                                                                                                             | filesystem artifact ownership with conversion failure injection | keep clipboard/provider UI out; compare native/PDF fixture behavior                   |

### 3.3 P2: production boundary prerequisites

These are not current Node migration candidates. They require a production or ownership boundary decision before any runner experiment.

| Test file                                                                       | Boundary prerequisite                                                  | Why not P0/P1                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `test/merge_pdf_operation.test.ts`, `test/undo_last_conversion.test.ts`         | move conversion record owner away from command notification module     | command-layer import is transitive `vscode`          |
| `test/output_conversion_messages.test.ts`                                       | inject locale/environment instead of module-scope VS Code state        | `vscode.env.language` is current dependency          |
| `test/latex_snippet.test.ts`                                                    | decide whether `SnippetString` belongs to Host adapter or pure builder | source constructs `vscode.SnippetString`             |
| `test/package_manifest.test.ts`                                                 | separate manifest/public ID constants from activation module           | static contract currently imports `extension.ts`     |
| `test/check_nls.test.ts`                                                        | separate extensionPath discovery from repository NLS script            | current test uses Extension API to find path         |
| `test/crop_pdf_configure_operation.test.ts`, `test/split_pdf_all_pages.test.ts` | inject configured renderer/path without Host helper                    | visual helper reads `vscode.workspace` configuration |
| `test/webview_html.test.ts`                                                     | define VS Code URI semantics versus generated-string contract          | fake Webview/URI currently mixes both                |

## 4. Tests that should remain VS Code Host candidates

| Test file                                | VS Code-specific contract                                                           | Why RT-VSCODE is justified                      | Split candidate                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `test/extension.test.ts`                 | extension discovery / activation / command registry / actual command execution      | real Extension Host registryとworkspaceがoracle | command operation correctnessはNode testへ寄せ、activation testを小さくする |
| `test/safe_mode_status_bar.test.ts`      | StatusBarItem、registerCommand、globalState                                         | VS Code API surface自体がcontract               | pure state transitionを分けるかは任意                                       |
| `test/latex_drop_edit_provider.test.ts`  | TextDocument、DataTransfer、DocumentDropEdit、SnippetString、CancellationToken      | provider contractはVS Code API                  | URI-list parseとsnippet generationはpure test候補                           |
| `test/latex_paste_edit_provider.test.ts` | QuickPick / InputBox、DocumentPasteEdit、DataTransfer、workspace、Undo notification | user interactionとprovider lifecycleがcontract  | save operation / Undo / snippetの既存lower-level testとの重複を整理する     |
| `test/convert_to_pdf_command.test.ts`    | command registration、configuration、selected Uri、notification completion          | public command behaviorがcontract               | source format conversionの組合せはoperation testへ移せる可能性              |
| `test/merge_pdf_command.test.ts`         | command registry、SaveDialog、selected Uri、notification                            | Explorer command journeyがcontract              | rasterized content comparisonはoperation testとの役割を整理する             |

## 5. Historical Browser Playwright inventory

### `test/playwright/webview-pdf-rendering.spec.ts`

この節はTask 0197以前の履歴を保存するためのもので、現行required runtimeではない。現在のWebview操作契約はJSDOM component test、PDF.js/canvasとHost bridgeはpackaged Electron E2Eで確認する。

現在確認したcontract群:

- PDF.jsでfirst / all pagesをcanvas描画する
- pixel markerによるrenderer output確認
- distant page lazy rendering
- Applyが全canvas完了を待たない
- devicePixelRatioとlayout sizeの分離
- text / annotation layerを作らない
- preview / settings layout、zoom controls
- Host message simulation
- crop input / output message

判定:

- PDF.js、canvas、DPI、IntersectionObserverはRT-BROWSERに残す根拠がある。
- VS Code Host message simulationとUI journeyはRT-ELECTRONと重複しやすい。
- 1 file 1000行超へ複数contractが集中しており、runner削除の前にcase groupを分割すべきである。

## 6. Electron inventory

### `test/playwright/electron/crop_pdf_configure.spec.ts`

現在確認したcontract群:

- fixed VS Codeの起動
- development extensionまたはinstalled VSIXのload
- Explorer context menuからCrop Configureを開く
- actual Webview frame / heading / canvas
- VS Code dark / light themeとcomputed style
- visual snapshot
- Apply後のPDF MediaBox / CropBox
- success notification
- packaged modeのcontrolled external-fetch failure
- packaged extension directoryからoperation moduleを直接import
- Sharpを使うPNG→JPEGとmissing external CLI error

判定:

| Group                                      | Proper evidence layer              | Current issue                          |
| ------------------------------------------ | ---------------------------------- | -------------------------------------- |
| open command → Webview → Apply → output    | RT-ELECTRON                        | critical journeyとして妥当             |
| dark / light visual snapshot               | RT-ELECTRON                        | journeyと同一caseでfailure原因が広い   |
| installed VSIX / controlled external-fetch | RT-PACKAGE                         | development journeyとmode switchで共存 |
| package内部module直接import                | RT-PACKAGEまたはNode package smoke | 利用者journeyのpublic boundaryではない |
| Sharp native load                          | RT-PACKAGE + RT-PLATFORM           | release artifact Evidenceとして妥当    |

## 7. Proposed first migration experiment

全面移行ではなく、まずP0集合でRT-NODE experimentを行う候補:

1. `source_format.test.ts`
2. `crop_pdf_protocol.test.ts`
3. `file_content_hash.test.ts`
4. `resolve_output_path.test.ts`
5. `workspace_path.test.ts`
6. `safe_mode.test.ts`
7. `run_staged_conversion_batch.test.ts`
8. `commit_conversion_outputs.test.ts`
9. `cleanup_conversion_artifacts.test.ts`

比較するEvidence:

- cold / warm execution time
- failure messageの読みやすさ
- Windows / macOS / Linux結果
- fixture path差
- hidden `vscode` dependency
- test数とassertionを減らさず移行できるか

このexperimentが成功しても、全testをVitestへ移す判断には直結しない。

## 8. Directory selection gate

runtimeの役割が採用された後に次を比較する。

### Option A: runtime-based root directories

```text
test/
  fixtures/
  node/
  vscode/
  browser/
  electron/
  packaging/
  support/
```

### Option B: unit / component co-location

```text
src/**/*.test.ts
webview/apps/*/src/**/*.test.tsx
test/vscode/
test/browser/
test/electron/
test/packaging/
test/fixtures/
```

### Decision criteria

- pathからrunnerを誤認しない
- testとproduction sourceのreview範囲が過度に広がらない
- TypeScript configが重複しない
- fixture / helper ownershipが明確
- AIが変更と無関係なtestを読み込まない
- migration中に同一contractの二重正本を作らない

## 9. Remaining completeness work

- branch protectionでrequiredになっているworkflow gateを確認する（authenticated GitHub accessが必要。現状unknown）
- Quick crop / Split /各output formatの専用public journeyが必要かをmaintainerが選択する
- Node/Vitest候補の代表experimentでhidden dependency、fixture再現性、3 OS、failure diagnosisを比較する

tree、全test file、helper、fixture、Browser/Electron caseの列挙自体は[test-file-inventory](test-file-inventory.md)と[browser-electron-overlap](browser-electron-overlap.md)で完了している。
