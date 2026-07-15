# Webviewのprotocol・CSP・i18n・性能を改善する

## Status

Todo

## Change Contract

### Problem

Crop Webviewのhost境界、lint適用範囲、CSP nonce、locale、全ページrender待ち、message型共有が不十分である。

### Allowed behaviors

- B-001: crop appへbrowser-only lint制約を適用する。
- B-002: crop入力・page range・zoom計算をpure moduleへ分離する。
- B-003: PDF metadataと最初の表示範囲を先に扱い、Applyは全canvas render完了を待たない。
- B-004: dispose時にrender task/resourceを可能な範囲でcancel/cleanupする。
- B-005: host/webview message protocolとtype guardを共有する。
- B-006: CSP nonceをcrypto randomにし、必要最小directiveを許可する。
- B-007: locale済みstringをhostから渡し、英日混在を防ぐ。

### Unresolved

- PDF.js worker/blob directiveの最小集合は実Electron smokeで確認する。

### Affected boundaries

Webview app、extension host、CSP、PDF.js、locale、browser runtime。

### Allowed files

- `webview/apps/crop_pdf/src/App.tsx`
- `webview/apps/crop_pdf/src/crop_input.ts`
- `webview/apps/crop_pdf/src/preview_zoom.ts`
- `webview/apps/crop_pdf/src/messages.ts`
- `webview/apps/crop_pdf/src/vscode.ts`
- `webview/apps/crop_pdf/vite.config.ts`
- `webview/shared/pdf/*.ts`
- `src/presentation/webview/get_webview_html.ts`
- `src/commands/crop_pdf_configure.ts`
- `oxlint.config.ts`
- `test/webview_html.test.ts`
- `test/crop_pdf_configure_operation.test.ts`
- `test/playwright/**/*.spec.ts`
- `docs/specs/crop-pdf-configure.md`
- `docs/tasks/0193-harden-webview-boundaries-and-performance.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification            | Evidence type        |
| -------- | ------------------------------ | -------------------- |
| B-001    | lint fixture/config test       | static check         |
| B-002    | pure logic tests               | unit test            |
| B-003    | browser/Electron behavior test | Playwright           |
| B-004    | dispose/cancel test            | Webview test         |
| B-005    | message guard tests            | protocol test        |
| B-006    | CSP nonce/directive assertions | source/browser test  |
| B-007    | English/Japanese UI assertions | visual/behavior test |

### Dependencies

- Blocked by: 0189
- Blocks: 0194, 0195
- Can run in parallel with: 0190, 0191, 0192

### Not changing

- Webview framework or state library
- PDF renderer replacement
- unrelated apps that do not exist

## Completion criteria

- 実在するCrop appだけへ制約と性能改善を適用する。
- browser/Electron verificationを実測する。
- CSPとlocaleが実装に一致する。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
