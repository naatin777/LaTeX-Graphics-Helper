# CI・release・VSIX packagingを再現可能にする

## Status

Blocked

他OS runnerでのpackageおよびpackaged VSIX smokeが未確認。
既に実施済みの検証結果は保持する。RuleSyncとtask preflightはv1正式導線ではない。

## Change Contract

### Problem

Linux、Windows、macOSの提供targetについて、lockfileベースのpackageとpackaged VSIX smokeをrelease matrixで確認する必要がある。lockfileベースのstaging、Sharp native smoke、target一致検証など、localで実施済みの結果は維持する。

### Allowed behaviors

- B-001: release matrixが提供targetごとにlockfileベースのVSIX packageとpackaged smokeを実行する。
- B-002: package target、runner platform/arch、Sharp native binaryの組合せが実測で一致する。

### Unresolved

- GitHub hosted runnerの`RUNNER_ARCH`とmacOS/Linux ARM availabilityはrelease実行時にmatrix実測する。
- VSIX publish tokenが存在しないlocal環境ではpublishは実行せず、CI導線だけを検証する。

### Affected boundaries

GitHub Actions、pnpm lockfile、staging package、native Sharp、VSIX target matrix、VS Code test version、offline packaged smoke。

### Allowed files

- `scripts/package-vsix.mjs`
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

| Behavior | Test / verification                       | Evidence type             |
| -------- | ----------------------------------------- | ------------------------- |
| B-001    | release matrix package and smoke          | CI configuration evidence |
| B-002    | target and native dependency verification | packaging test            |

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

- B-001とB-002のrelease matrix evidenceが成功している。
- taskのVerification resultsを実測値で埋める。

## Completion criteria

- `pnpm install --frozen-lockfile`、formal checks、build、target package、packaged smokeの結果が記録されている。
- 実行できなかったOS/targetはDoneにせずUnresolvedまたはBlockedへ記録する。

## Verification results

以下は実装済み部分の履歴である。RuleSync、task preflight、harness checkの結果は当時の実測値として保持するが、現行の正式checkには含めない。

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
