# Webviewのprotocol・CSP・i18n・性能を改善する

## Status

In Progress

## Change Contract

### Problem

実在する`webview/apps/crop_pdf`に対するlint境界がなく、Host/Webview message型が分散し、CSP nonceが`Math.random()`で生成される。Crop appは全PDFページを順番にrenderしてApplyを待たせ、画面文言も固定言語である。

### Allowed behaviors

- B-001: 実在するCrop Webview appとshared frontendへNode/VS Code/extension runtime/他app import禁止を適用する。
- B-002: Crop ConfigureのHost/Webview message typeとtype guardを小さいpure shared protocolへ集約する。
- B-003: CSP nonceをNode built-inの暗号学的乱数で生成し、script-srcはnonce付きscriptに必要な範囲だけ許可する。
- B-004: Crop Appの入力解析とpreview zoom計算をpure moduleへ分離する。
- B-005: PDF metadataと最初のページを先に読み込み、表示範囲付近をIntersectionObserverでlazy renderする。Applyは全ページcanvas完了を待たない。
- B-006: Webview UI文言、aria-label、page/zoom補助文言をHostからlocale済みlabelsとして渡し、英日混在を避ける。
- B-007: panel dispose時にrender taskとPDF documentを可能な範囲でcleanupする。

### Unresolved

- PDF.jsのworker内部taskを公開APIだけで完全cancelできる範囲は、実ブラウザ/Electron testで確認する。
- VS Codeが提供するlocaleのうち英語・日本語以外は英語fallbackとする。

### Affected boundaries

Crop Webview frontend、PDF.js rendering lifecycle、Host/Webview protocol、CSP、VS Code locale、oxlint overrides。

### Allowed files

- `webview/apps/crop_pdf/src/**`
- `webview/apps/crop_pdf/index.html`
- `webview/shared/crop_pdf_protocol.ts`
- `webview/shared/pdf/render_pdf_pages.ts`
- `webview/shared/pdf/render_first_page.ts`
- `webview/tsconfig.json`
- `webview/vite.config.ts`
- `oxlint.config.ts`
- `src/commands/crop_pdf_configure.ts`
- `src/commands/crop_pdf_auto.ts`
- `src/presentation/webview/get_webview_html.ts`
- `src/locale_map.ts`
- `src/application/crop_pdf_protocol.ts`
- `package.nls.json`
- `package.nls.ja.json`
- `test/webview_html.test.ts`
- `test/crop_pdf_protocol.test.ts`
- `test/crop_pdf_configure_command.test.ts`
- `test/webview/**`
- `test/playwright/webview-pdf-rendering.spec.ts`
- `docs/specs/crop-pdf-configure.md`
- `docs/tasks/0192-harden-latex-drop-and-paste.md`
- `docs/tasks/0193-harden-webview-boundaries-and-performance.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification                             | Evidence type            |
| -------- | ----------------------------------------------- | ------------------------ |
| B-001    | Crop app lint fixture/config test               | static check             |
| B-002    | protocol type guard tests and command tests     | unit/integration test    |
| B-003    | Webview HTML nonce/CSP test                     | security regression test |
| B-004    | crop input/zoom pure tests                      | unit test                |
| B-005    | Playwright first-page/lazy-render/apply tests   | browser behavior test    |
| B-006    | English/Japanese init label tests and NLS check | localization test        |
| B-007    | dispose/cancel render test                      | lifecycle test           |

### Dependencies

- Blocked by: 0188, 0192
- Blocks: 0194
- Can run in parallel with: 0195

### Not changing

- PDF crop operation semantics and output safety.
- New Webview framework, state library, schema dependency, or virtual-scroll framework.
- Non-Crop Webview app that does not exist in the repository.

## 目的

実際に配布されるCrop Webviewだけを対象に、安全な境界、再利用可能なprotocol、暗号学的CSP nonce、locale、初期表示性能を整える。

## 完了条件

- B-001からB-007のEvidence matrixが成功している。
- `pnpm run check:all`とWebview browser/Electron testが成功している。

## Completion criteria

- App.tsxがUI orchestration中心になり、入力/zoomロジックが分離されている。
- Applyが全ページrender完了へ依存しない。
- taskのVerification resultsを実測値で埋める。

## Verification results

| Command                                                                                                   | Result                                    | Notes                                                                       |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| `pnpm run check:all`                                                                                      | Passed                                    | lint, format, runtime/test/Webview typecheck, RuleSync, task preflight, NLS |
| `pnpm run build`                                                                                          | Passed                                    | extension and Crop Webview production build                                 |
| `pnpm exec vscode-test --grep 'Webview HTML生成                                                           | Crop PDF Webview protocol' --forbid-only` | Passed                                                                      | 3 VS Code integration tests |
| `pnpm exec playwright test test/playwright/webview-pdf-rendering.spec.ts --project=webview-browser`       | Passed                                    | browser Webview suite, including lazy render and Apply behavior             |
| `pnpm exec playwright test test/playwright/electron/crop_pdf_configure.spec.ts --project=vscode-electron` | Passed                                    | 1 VS Code Electron Configure test                                           |
| `pnpm run nls:check`                                                                                      | Passed                                    | 220 English/Japanese keys and placeholders                                  |
| `git diff --check`                                                                                        | Passed                                    | no whitespace errors                                                        |

## 変更可能なファイル

- Change ContractのAllowed filesと同じ。

## 対象外

- CI/release/VSIX packaging。
- Crop以外の存在しないWebview appの追加。

## 関連

- [PDF configure crop仕様](../specs/crop-pdf-configure.md)

## 確認方法

- oxlintでCrop appへの禁止import fixtureを検出する。
- Webview HTMLのnonce、CSP directive、localeをテストする。
- Playwrightで初期ページ、lazy page、Apply/cancel message、disposeを確認する。
