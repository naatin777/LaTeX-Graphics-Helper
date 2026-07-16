# v1 test runtime inventory

- 状態: 監査用draft
- 対象: `origin/next/v1` at `75ca52a`のlocal Git tree、test、runner config、package script、workflow
- 方法: `git ls-files`、test構文抽出、relative import graph、helper / fixture / snapshot列挙でrepository内を再確認した。
- 訂正: 以前の「GitHub connectorではdirectory treeを直接列挙できず、inventory未完了」という注意書きは、この監査でlocal treeを正本に完全列挙したため無効である。

## 0. Complete inventory counts

詳細なfile単位表とcase indexは[test-file-inventory](test-file-inventory.md)にある。

| Scope                 |  Files |   Cases | Current execution              |
| --------------------- | -----: | ------: | ------------------------------ |
| Root `test/*.test.ts` |     45 |     207 | VS Code Extension Host / Mocha |
| Browser Playwright    |      1 |      18 | Chromium                       |
| Electron Playwright   |      1 |       1 | VS Code Electron               |
| **Total**             | **47** | **226** | Vitest current cases: 0        |

`test:all`はroot Host 207 + Browser 18 = 225 casesであり、Electron、packaged VSIX、Vitestを含まない。

## 1. Runtime definitions

| Runtime ID  | Runtime                        | Required when                                                                                                         | Not a reason by itself                                    |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| RT-NODE     | Node test runner / Vitest候補  | pure logic、Node filesystem、child process、PDF / image library、failure injection                                    | 現在`test/`に置かれていること                             |
| RT-VSCODE   | VS Code Extension Host / Mocha | `vscode` command registry、workspace、configuration、TextDocument、DataTransfer、globalState、notification / progress | production moduleが偶然`vscode`をtop-level importすること |
| RT-BROWSER  | Browser Playwright             | Chromium canvas、PDF.js worker、layout、DPI、IntersectionObserver、scroll                                             | Webviewという名前が付いていること                         |
| RT-ELECTRON | Real VS Code Electron          | VS Code window、actual Webview frame、theme CSS variables、Host message bridge、critical user journey                 | pure operationやpackage内部moduleの全組合せ               |
| RT-PACKAGE  | Installed VSIX smoke           | packaged artifact、native dependency、offline installation / execution                                                | development extension pathの動作                          |
| RT-PLATFORM | Native OS matrix               | path、shell、external process、native module、file lock等のOS差                                                       | 1 OSのsimulationだけ                                      |

## 2. Runner and script inventory

| Entry                      | Actual execution                                            | Platform / trigger                                       | Meaning gap                                             |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `test`                     | `test:vscode`                                               | local                                                    | 名前だけではExtension Host testと分からない             |
| `test:vscode`              | build:test後に`vscode-test`                                 | fixed VS Code 1.128.0                                    | `out/test/**/*.test.js`をすべてExtension Hostへ入れる   |
| `test:playwright`          | Browser projectのみ                                         | local / Playwright workflow 3 OS                         | browser renderer suite                                  |
| `test:playwright:electron` | Electron projectのみ                                        | local / Test workflow Linux / release 3 OS packaged mode | development journeyとpackaged smokeを同じspecで切替える |
| `test:all`                 | `test:vscode` + Browser Playwright                          | local                                                    | Electron、packaging、Vitestを含まないため名称が曖昧     |
| `check:all`                | lint / format / TS / NLS                                    | Check workflow                                           | runtime testではない                                    |
| Test workflow              | VS Code test 3 OS + Electron Linux                          | PR / main push、docs-only skip                           | runtime Evidenceを提供する。初稿監査では見落としていた  |
| Playwright workflow        | Browser Playwright 3 OS + gate                              | PR / main push、docs-only skip                           | renderer Evidenceを提供する                             |
| Release workflow           | static verify + VSIX package / packaged Electron smoke 3 OS | tag                                                      | distribution Evidenceを提供する                         |
| Vitest config              | `webview/vitest.config.ts`                                  | formal root scriptなし                                   | 未完了導入か残存toolか未決                              |

## 3. Tests whose contract is Node-level

### 3.1 Strong Node candidates

次は現在のtest/source/helper graphを確認した範囲で、直接・推移的に`vscode`を必要とせず、contract上もVS Code runtimeを必要としないNode-level候補である。移行を実施した結果ではない。

| Test file                                   | Contract / oracle                                      | Current runner | Recommended experiment | Notes                                                      |
| ------------------------------------------- | ------------------------------------------------------ | -------------- | ---------------------- | ---------------------------------------------------------- |
| `test/source_format.test.ts`                | extension / compound extension判定                     | RT-VSCODE      | RT-NODE                | pure synchronous logic                                     |
| `test/crop_pdf_protocol.test.ts`            | Webview message payload validation                     | RT-VSCODE      | RT-NODE                | browser / Host双方が共有するprotocol contract              |
| `test/file_content_hash.test.ts`            | streaming SHA-256 / content equality                   | RT-VSCODE      | RT-NODE                | Node filesystemだけを使用                                  |
| `test/run_external_tool.test.ts`            | argument array、redaction、stdout                      | RT-VSCODE      | RT-NODE                | Node child processだけを使用                               |
| `test/run_staged_conversion_batch.test.ts`  | stage / commit / operation-root cleanup                | RT-VSCODE      | RT-NODE                | filesystem transaction test                                |
| `test/commit_conversion_outputs.test.ts`    | Keep Both、overwrite、rollback、cancel、race detection | RT-VSCODE      | RT-NODE                | safety-critical。runner移行時もfailure injectionを維持する |
| `test/cleanup_conversion_artifacts.test.ts` | preserve backup、symlink、別session保護                | RT-VSCODE      | RT-NODE                | safety-critical filesystem test                            |
| `test/convert_png_to_pdf.test.ts`           | real PNG→PDF operation                                 | RT-VSCODE      | RT-NODE                | VS Code UIを対象外と明記済み                               |
| `test/convert_to_pdf_drawio_path.test.ts`   | Draw.io runner boundary、Unicode path、PDF result      | RT-VSCODE      | RT-NODE                | external CLIはfake、file / PDF oracleはreal                |
| `test/save_clipboard_image.test.ts`         | Clipboard save operationのrollback artifact ownership  | RT-VSCODE      | RT-NODE                | clipboard UIではなくBuffer / filesystem contract           |

### 3.2 Node contractだがtransitive / convenience dependencyがあるもの

| Test file                                   | Current dependency                                                           | Contractually needed runtime            | Migration prerequisite                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `test/undo_last_conversion.test.ts`         | command moduleの`rememberLastConversion`をimport                             | 主contractはRT-NODE                     | memory record ownerとVS Code notification commandを分離するか、operation部分だけ先に移す           |
| `test/output_conversion_messages.test.ts`   | command message helper / locale helper                                       | RT-NODEで可能                           | locale helperがVS Code APIへ依存しないことを確認する                                               |
| `test/crop_pdf_configure_operation.test.ts` | `vscode` importとworkspace setting helperが混在                              | crop operation oracleはRT-NODE          | output path setting testとoperation visual testを分ける                                            |
| `test/package_manifest.test.ts`             | `PUBLIC_COMMAND_IDS`を`extension.ts`からimportし、transitively`vscode`へ依存 | manifest consistencyはRT-NODEで可能     | command ID constantsのownerをVS Code activation moduleから分離するか、manifestだけをstatic検証する |
| `test/check_nls.test.ts`                    | extension APIからextensionPathを取得                                         | NLS script contractはRT-NODE            | repository rootを直接解決してscriptを実行する                                                      |
| `test/webview_html.test.ts`                 | fake `vscode.Webview` / `Uri`                                                | HTML / CSP contractはNodeでも可能性あり | VS Code URI semanticsをどこまでcontractに含めるか決める                                            |
| `test/merge_pdf_operation.test.ts`          | `rememberLastConversion`をcommand moduleからimport                           | RT-NODE候補                             | record ownerと通知commandの境界確認が前提。現状はtransitiveに`vscode`を持つ                        |

`split_pdf_all_pages.test.ts`もoperation自体はNode-level候補だが、現状はpdftocairo設定を読む`pdf_visual_assertions` helper経由でExtension Hostへ入る。`latex_snippet.test.ts`は`SnippetString`、`output_conversion_messages.test.ts`はlocale module、`package_manifest.test.ts`はactivation moduleを経由するため、import有無だけで移行可とは判定しない。

## 4. Tests that should remain VS Code Host candidates

| Test file                                | VS Code-specific contract                                                           | Why RT-VSCODE is justified                      | Split candidate                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `test/extension.test.ts`                 | extension discovery / activation / command registry / actual command execution      | real Extension Host registryとworkspaceがoracle | command operation correctnessはNode testへ寄せ、activation testを小さくする |
| `test/safe_mode_status_bar.test.ts`      | StatusBarItem、registerCommand、globalState                                         | VS Code API surface自体がcontract               | pure state transitionを分けるかは任意                                       |
| `test/latex_drop_edit_provider.test.ts`  | TextDocument、DataTransfer、DocumentDropEdit、SnippetString、CancellationToken      | provider contractはVS Code API                  | URI-list parseとsnippet generationはpure test候補                           |
| `test/latex_paste_edit_provider.test.ts` | QuickPick / InputBox、DocumentPasteEdit、DataTransfer、workspace、Undo notification | user interactionとprovider lifecycleがcontract  | save operation / Undo / snippetの既存lower-level testとの重複を整理する     |
| `test/convert_to_pdf_command.test.ts`    | command registration、configuration、selected Uri、notification completion          | public command behaviorがcontract               | source format conversionの組合せはoperation testへ移せる可能性              |
| `test/merge_pdf_command.test.ts`         | command registry、SaveDialog、selected Uri、notification                            | Explorer command journeyがcontract              | rasterized content comparisonはoperation testとの役割を整理する             |

## 5. Browser Playwright inventory

### `test/playwright/webview-pdf-rendering.spec.ts`

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
- packaged modeのnetwork block
- packaged extension directoryからoperation moduleを直接import
- Sharpを使うPNG→JPEGとmissing external CLI error

判定:

| Group                                   | Proper evidence layer              | Current issue                          |
| --------------------------------------- | ---------------------------------- | -------------------------------------- |
| open command → Webview → Apply → output | RT-ELECTRON                        | critical journeyとして妥当             |
| dark / light visual snapshot            | RT-ELECTRON                        | journeyと同一caseでfailure原因が広い   |
| installed VSIX / offline                | RT-PACKAGE                         | development journeyとmode switchで共存 |
| package内部module直接import             | RT-PACKAGEまたはNode package smoke | 利用者journeyのpublic boundaryではない |
| Sharp native load                       | RT-PACKAGE + RT-PLATFORM           | release artifact Evidenceとして妥当    |

## 7. Proposed first migration experiment

全面移行ではなく、次の小さい集合でRT-NODE experimentを行う候補:

1. `source_format.test.ts`
2. `crop_pdf_protocol.test.ts`
3. `file_content_hash.test.ts`
4. `run_external_tool.test.ts`
5. `run_staged_conversion_batch.test.ts`
6. `commit_conversion_outputs.test.ts`
7. `cleanup_conversion_artifacts.test.ts`

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
