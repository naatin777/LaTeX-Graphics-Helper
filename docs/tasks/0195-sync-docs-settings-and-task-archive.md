# README・NLS・設定・task archiveを同期する

## Status

Done

## Change Contract

### Problem

README、NLS、Safe Mode、外部tool、staging寿命、Mermaid設定、legacy pair-specific outputPath、task index、backlogが実装証拠と一致していない。

### Allowed behaviors

- B-001: READMEの外部tool・Output Panel・Safe Mode・staging説明を実装と一致させる。
- B-002: NLS key、placeholder、package参照、userMessage引数を機械検証する。
- B-003: Mermaid設定を出力形式から独立させ、旧keyは未指定時のみfallbackする。
- B-004: pair-specific outputPathはlegacyとして優先順位とmajor移行方針を明記する。
- B-005: tsconfig include/excludeとdeactivateを実態に合わせる。
- B-006: completed taskをarchiveし、README indexをCurrent/Planned/Blocked/Recent/archiveに限定する。
- B-007: 今回見つけた未対応事項をEvidence付きでrefactor backlogへ記録する。

### Unresolved

- legacy keyの廃止majorは、利用実態と次major計画を確認して具体化する。

### Affected boundaries

README、NLS、VS Code configuration、task management、refactor backlog。

### Allowed files

- `README.md`
- `README.ja.md`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `src/commands/user_messages.ts`
- `src/commands/convert_png_to_pdf.ts`
- `src/commands/convert_to_png.ts`
- `src/commands/convert_to_jpeg.ts`
- `src/commands/convert_to_webp.ts`
- `src/commands/convert_to_avif.ts`
- `src/commands/convert_to_svg.ts`
- `src/config/mermaid_puppeteer_options.ts`
- `scripts/check-nls.mjs`
- `test/mermaid_puppeteer_options.test.ts`
- `.github/scripts/install-image-tools-macos.sh`
- `.github/scripts/install-test-tools-linux.sh`
- `.github/scripts/install-image-tools-windows.ps1`
- `tsconfig.json`
- `tsconfig.test.json`
- `docs/tasks/README.md`
- `docs/tasks/archive/**`
- `docs/refactor-backlog.md`
- `docs/specs/*.md` (affected behavior only)
- `docs/adr/*.md` (affected decision only)
- `docs/tasks/0195-sync-docs-settings-and-task-archive.md`

### Evidence matrix

| Behavior | Test / verification              | Evidence type                 |
| -------- | -------------------------------- | ----------------------------- |
| B-001    | README/spec audit and docs check | documentation evidence        |
| B-002    | NLS consistency command/test     | automated consistency         |
| B-003    | configuration tests              | config behavior test          |
| B-004    | precedence test and ADR/backlog  | config/docs evidence          |
| B-005    | typecheck/config audit           | static check                  |
| B-006    | task link/index check            | task harness                  |
| B-007    | backlog review                   | evidence-backed documentation |

### Dependencies

- Blocked by: 0188, 0192, 0193, 0194
- Blocks: v1 handoff
- Can run in parallel with: none

### Not changing

- production behavior without an earlier task contract
- deleting completed task files
- adding undocumented guarantees

## Completion criteria

- docs/config/NLS/task indexが実装・test・specと一致する。
- archive後も全task linkが解決する。
- 最終10-passと正式verificationを実測し、未確認範囲を明記する。

## Verification results

| Command                                                              | Result | Notes                                                                                                                                                        |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm run check:nls`                                                 | Pass   | 272 English/Japanese keys, placeholders, package references, and static `userMessage` arguments are consistent.                                              |
| `pnpm run typecheck && pnpm run typecheck:test`                      | Pass   | Production and Extension Host test TypeScript checks passed.                                                                                                 |
| `pnpm run check:all`                                                 | Pass   | Lint, format, all typechecks, NLS, placeholders, package references, and `userMessage` arguments passed.                                                     |
| `pnpm run build`                                                     | Pass   | Production, test, and all three Webview bundles built successfully.                                                                                          |
| `pnpm run test`                                                      | Pass   | 223 Extension Host tests passed, including common Mermaid setting precedence, legacy fallback, and TypeScript scanner-based `userMessage` argument counting. |
| `pnpm run test:webview`                                              | Pass   | Crop 1, Merge 1, and Split 2 Webview component tests passed.                                                                                                 |
| `tsconfig.json`, `tsconfig.test.json`, and extension lifecycle audit | Pass   | Include/exclude matches the source/test boundaries; no `deactivate` export is required because disposables are owned by `context.subscriptions`.             |
| `git diff --check`                                                   | Pass   | No whitespace errors.                                                                                                                                        |
