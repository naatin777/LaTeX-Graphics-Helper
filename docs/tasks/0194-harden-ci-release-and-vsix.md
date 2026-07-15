# CI・release・VSIX packagingを再現可能にする

## Status

Todo

## Change Contract

### Problem

静的check、task harness、release check、lockfile準拠runtime packaging、target matrix、Sharp smoke、固定VS Code versionの保証が不十分である。

### Allowed behaviors

- B-001: 通常CIでfrozen install、check:all、rulesync:check、harness:checkを実行する。
- B-002: docs-onlyでもtask/RuleSync/NLS/link整合をskipしない。
- B-003: release package前に正式checkとbuildを実行する。
- B-004: runtime dependencyをlockfileどおりにpackageし、dev dependencyを除外する。
- B-005: Windows packagingで不要なshell invocationを使わない。
- B-006: 実際にbuild・smokeするtargetだけを宣言する。
- B-007: packaged VSIXでSharpを実際にloadする。
- B-008: release CLIはpnpm execのinstalled versionを使う。
- B-009: required VS Code test versionを固定する。

### Unresolved

- pnpm deployと現行native dependencyの組み合わせは公式情報と実パッケージで確認してから採否を決める。

### Affected boundaries

GitHub Actions、pnpm、VSIX、native dependency、VS Code test、release tag。

### Allowed files

- `.github/workflows/*.yml`
- `.github/scripts/*`
- `scripts/package-vsix.mjs`
- `scripts/*.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `test/package_manifest.test.ts`
- `test/playwright/electron/helpers/packaged_vsix.ts`
- `docs/adr/0015-build-platform-specific-vsix-from-runtime-staging.md`
- `docs/research/*.md` (packaging-related only)
- `docs/tasks/0194-harden-ci-release-and-vsix.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification            | Evidence type             |
| -------- | ------------------------------ | ------------------------- |
| B-001    | CI workflow and local check    | workflow/static check     |
| B-002    | docs-only fixture              | classifier/harness test   |
| B-003    | release workflow audit         | workflow check            |
| B-004    | packaged dependency inspection | package test              |
| B-005    | Windows spawn source/test      | static/platform check     |
| B-006    | target matrix/package smoke    | package test              |
| B-007    | offline raster VSIX smoke      | Electron integration test |
| B-008    | package script audit           | static check              |
| B-009    | test configuration inspection  | reproducibility check     |

### Dependencies

- Blocked by: 0188, 0190, 0191, 0193
- Blocks: 0195
- Can run in parallel with: none

### Not changing

- publish/upload credentials or external release execution
- new runtime dependencies
- unsupported cross-compiled native binaries

## Completion criteria

- CI/releaseの正式導線が実際に対象checkを通る。
- package target、lockfile、Sharp smokeの範囲が一致する。
- 実行できない検証をskip扱いにせず記録する。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
