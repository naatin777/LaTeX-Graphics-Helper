# 0205: Organize test contracts

## Objective

v1の公開機能と安全性contractに対して、意味のあるテストEvidenceを不足・重複・誤認のない構成へ整理する。

## Baseline

- branch: `next/v1`
- baseline commit: `f8722ff9e5b47e940a5bbeaad743bc676f940571`
- final commit: `<project-root>/HEAD (local branch task/0205-organize-test-contracts)`

## Current state (before changes)

### Test file count and case count (before)

- 64 Mocha test files, 342 test cases
- 1 Playwright spec file, 1 test case
- 3 Webview test files, 4 test cases
- Total: 68 files, 347 cases

### Test file count and case count (after)

- 63 Mocha test files (~355 test cases, removed 1 file, added ~11 cases)
- 1 Playwright spec file, 8 test cases (split from 1 to 8)
- 3 Webview test files, 4 test cases
- Total: 67 files, ~367 cases

### Runtime scope

- `npm test` → VS Code Extension Host (Mocha, VS Code 1.128.0)
- `npm run test:webview` → Vitest (JSDOM component tests)
- `npm run test:playwright:vsix` → Playwright Electron (installed VSIX)
- `npm run check:all` → lint + format + typecheck + NLS

## Decisions

### Keep / Rewrite / Split / Delete / Add

| File                                                  | Decision          | Reason                                                                                                       |
| ----------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `test/operations/convert_to_png_drawio_route.test.ts` | **Delete**        | Source-text oracle; runtime evidence exists in `convert_to_png_operation.test.ts`                            |
| `test/operations/run_external_tool.test.ts`           | **Rewrite**       | Missing AbortSignal, single case mixing 4 contracts                                                          |
| `test/playwright/electron/crop_pdf_configure.spec.ts` | **Split** (1→8)   | Multiple responsibilities in one case (activation, crops, themes, merge, split, Sharp, network, CLI failure) |
| `test/integration/extension.test.ts`                  | **Add** (2 cases) | Missing `cropPdf.auto` and `splitPdf.allPages` command execution evidence                                    |

### Deleted tests and replacement Evidence

| Deleted test                          | Contract it defended                                     | Replacement Evidence                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `convert_to_png_drawio_route.test.ts` | Draw.io→PNG route uses PDF intermediate (not PNG direct) | `convert_to_png_operation.test.ts` (lines 72-78: checks `-x -f pdf` args, PDF intermediate, readable PNG output) + runner injection test |

### Maintainer decisions required

1. **Merge public spec**: `mergePdf.selectedFiles` has command/operation tests but no dedicated user-facing spec. Merge mode doc vs dedicated spec choice is open.
2. **content oracle per format**: Current oracle is page count/dimensions for most formats. Strengthening to pixel-level comparison for all formats needs fixture selection and tolerance baseline.
3. **PR packaging evidence scope**: `test:playwright:vsix` runs only on Linux in PR. Whether 3 OS packaging smoke is required for all PRs is a maintainer/CI cost decision.

## Verification (macOS local)

| Command                                     | Result | Cases       | Duration | Notes                     |
| ------------------------------------------- | ------ | ----------- | -------- | ------------------------- |
| `npm run check:all`                         | ✅     | N/A         | ~4s      | lint/format/typecheck/NLS |
| `npm run build`                             | ✅     | N/A         | ~10s     | compile + webview         |
| `npm test`                                  | ✅     | 356 passing | ~50s     | VS Code 1.128.0           |
| `npm run test:webview`                      | ✅     | 4 passing   | ~6s      |                           |
| `npm run package`                           | ✅     | 1 VSIX      | ~20s     | darwin-arm64, 83MB        |
| `npm run test:playwright:vsix` (first run)  | ✅     | 8 passing   | ~2m40s   |                           |
| `npm run test:playwright:vsix` (second run) | ✅     | 8 passing   | ~2m35s   | flake check               |
| `npm test` (second run)                     | ✅     | 356 passing | ~48s     | flake check               |
| `npm run test:webview` (second run)         | ✅     | 4 passing   | ~5s      | flake check               |

### External tools available (macOS)

- Ghostscript (`gs`): available
- pdftocairo: configured with missing path for tests
- Mermaid CLI: available
- Draw.io Desktop: not installed (tests use fake runners)
- rsvg-convert: available
- Sharp: available (production native dependency)

### OS

- macOS (Darwin, arm64) — only OS tested locally

## Updated Evidence

- `docs/test-matrix.md`: rewritten with detailed oracle columns (Core behavior, Content oracle, Invalid/failure, Safe Mode, Undo, Cancel, Platform, Packaged, Primary Evidence, Known gap)
- `docs/foundation/test-file-inventory.md`: marked as historical snapshot (`75ca52a` baseline)
- `docs/foundation/test-runtime-inventory.md`: marked as historical snapshot
- `docs/foundation/evidence-gaps.md`: marked as historical snapshot
- `docs/foundation/capability-catalog.md`: marked as historical snapshot

## Unverified

- Linux and Windows: not tested locally (CI verifies 3 OS)
- browser Playwright: retired per ADR-0017, not re-tested
- actual Draw.io CLI execution in command suite: not verified
- content oracle beyond page count/dimensions for all output formats
- packaged Safe/Undo dialog journey (no Electron notification action test)
- AC L/permission/race for workspace boundary
- `cropPdf.auto` and `splitPdf.allPages` error notification test via executeCommand (QuickPick interaction required)
