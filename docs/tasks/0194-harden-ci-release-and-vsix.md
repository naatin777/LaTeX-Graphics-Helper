# CI・release・VSIX packagingを再現可能にする

## Status

In Progress

## Change Contract

### Problem

通常CIはRuleSyncと通常checkだけで、task/NLS/harnessを正式導線へ含めていない。releaseはtag時の正式checkを保証せず、VSIX stagingでnpmがsemver rangeを再解決し、Windowsでは`shell:true`、CLI公開では`npm exec --yes`を使っている。packaged smokeもSharp native loadを確認していない。

### Allowed behaviors

- B-001: check workflowが`check:all`、RuleSync、task preflight、NLSをPR/pushとdocs-onlyで実行する。
- B-002: task preflightはCIでPR baseとの差分を検証し、localではworktree/staged filesを検証する。
- B-003: release tagがpackage前に正式checkとbuildを通過する。
- B-004: VSIX stagingはpnpm-lock.yamlを使うproduction deployでruntime dependencyを再解決しない。dev dependencyはstaging packageへ含めない。
- B-005: packagingとrelease publishはインストール済みpnpm CLIを使い、`npm install`、`npm exec --yes`、shell command stringを使わない。
- B-006: package scriptはcurrent runner platform/archとtargetを一致させ、release matrixが実際に生成するtargetだけを提供する。
- B-007: packaged VSIX smokeが各targetでSharpをloadするraster conversionを実行する。
- B-008: integration testのVS Code versionを固定し、必要ならlatest compatibilityは別導線にする。

### Unresolved

- GitHub hosted runnerの`RUNNER_ARCH`とmacOS/Linux ARM availabilityはrelease実行時にmatrix実測する。
- VSIX publish tokenが存在しないlocal環境ではpublishは実行せず、CI導線だけを検証する。

### Affected boundaries

GitHub Actions、pnpm lockfile、staging package、native Sharp、VSIX target matrix、VS Code test version、offline packaged smoke。

### Allowed files

- `scripts/package-vsix.mjs`
- `scripts/validate-current-task.mjs`
- `.github/workflows/check.yml`
- `.github/workflows/test.yml`
- `.github/workflows/playwright.yml`
- `.github/workflows/release.yml`
- `.vscode-test.mjs`
- `test/playwright/electron/crop_pdf_configure.spec.ts`
- `test/safe_mode_status_bar.test.ts`
- `test/playwright/electron/helpers/packaged_vsix.ts`
- `test/package_vsix.test.ts`
- `docs/tasks/0193-harden-webview-boundaries-and-performance.md`
- `docs/tasks/0194-harden-ci-release-and-vsix.md`
- `docs/tasks/README.md`
- `docs/specs/packaging.md`
- `docs/adr/0015-reproducible-vsix-packaging.md`

### Evidence matrix

| Behavior | Test / verification                              | Evidence type             |
| -------- | ------------------------------------------------ | ------------------------- |
| B-001    | workflow/static script checks                    | CI configuration evidence |
| B-002    | task preflight base-mode test                    | harness test              |
| B-003    | release workflow verification job                | CI configuration evidence |
| B-004    | package staging manifest/node_modules inspection | packaging test            |
| B-005    | package script and workflow command search       | static check              |
| B-006    | target mismatch test and runner matrix           | packaging test            |
| B-007    | packaged VSIX PNG-to-JPEG smoke                  | Electron integration test |
| B-008    | fixed version config and test run                | integration test          |

### Dependencies

- Blocked by: 0185, 0188, 0193
- Blocks: 0195
- Can run in parallel with: none on critical path

### Not changing

- runtime dependency versions or adding a new dependency.
- cross-compiling untested native binaries.
- publishing from the local worktree.
- unrelated CI scope redesign.

## 目的

tagからVSIXまでの検証・依存・target・native moduleの経路を、lockfileと実runnerに基づく再現可能なものにする。

## 完了条件

- B-001からB-008のEvidence matrixが成功している。
- package targetの実runner smokeが完了する。
- taskのVerification resultsを実測値で埋める。

## Completion criteria

- `pnpm install --frozen-lockfile`、formal checks、build、target package、packaged smokeの結果が記録されている。
- 実行できなかったOS/targetはDoneにせずUnresolvedまたはBlockedへ記録する。

## Verification results

| Command                                                                                                                                                    | Result          | Notes                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                           | Pass            | pnpm 11.8.0; lockfile resolution skipped.                                              |
| `pnpm run check:all`                                                                                                                                       | Pass            | lint warnings only; RuleSync, task preflight, and NLS consistency passed.              |
| `pnpm run build`                                                                                                                                           | Pass            | Runtime TypeScript and Crop Webview production build passed.                           |
| `pnpm run package:vsix -- --target darwin-arm64 --out /tmp/lgh-package-darwin-arm64.vsix`                                                                  | Pass            | 94 MB VSIX produced; production staging used 248 packages and Sharp install completed. |
| `LGH_VSIX_PATH=/tmp/lgh-package-darwin-arm64.vsix pnpm exec playwright test --project=vscode-electron test/playwright/electron/crop_pdf_configure.spec.ts` | Pass            | 1 test passed; installed VSIX exercised PDF operations and packaged Sharp PNG→JPEG.    |
| `pnpm run package:vsix -- --target linux-x64 ...` on `darwin-arm64`                                                                                        | Pass            | Rejected with exit 1 because target did not match runner.                              |
| `LGH_TASK_BASE=HEAD~1 pnpm run task:check`                                                                                                                 | Pass            | CI-style base diff mode accepted the committed task scope.                             |
| `pnpm run test:vscode`                                                                                                                                     | Pass            | 214 tests passed after aligning the Safe Mode tooltip expectation with NLS.            |
| `pnpm run test:playwright`                                                                                                                                 | Pass            | 18 browser tests passed.                                                               |
| `pnpm run test:playwright:electron`                                                                                                                        | Pass            | 1 Electron test passed on VS Code 1.128.0.                                             |
| `pnpm run rulesync:generate` and `pnpm run rulesync:check`                                                                                                 | Pass            | Generated outputs were up to date.                                                     |
| `pnpm run harness:check`                                                                                                                                   | Pass            | Current Task, RuleSync, and 220-key NLS consistency passed.                            |
| `git diff --check`                                                                                                                                         | Pass            | No whitespace errors.                                                                  |
| package/smoke on `linux-*`, `win32-*`, and `darwin-x64` runners                                                                                            | Not run locally | Must be confirmed by the release matrix before this task can be marked Done.           |

## 変更可能なファイル

- Change ContractのAllowed filesと同じ。

## 対象外

- package dependencyのupgrade。
- VSIX marketplace tokenの設定。
- CI runnerの追加購入やcross compile。

## 関連

- [VSIX packaging仕様](../specs/packaging.md)
- [再現可能なVSIX packaging ADR](../adr/0015-reproducible-vsix-packaging.md)

## 確認方法

- package stagingをinspectしてlockfile version、dev dependency除外、Sharp native loadを確認する。
- GitHub Actions YAMLのdocs-only、tag、publish、target matrixを静的検証する。
