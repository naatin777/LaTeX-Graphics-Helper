# Safe Mode・command境界・Output Channelを統一する

## Status

Done

## Change Contract

### Problem

Safe Mode取消、command入力検証、operation前のpath validation、Output Channel、command登録表の境界が機能間で不均一である。

### Allowed behaviors

- B-001: success、user cancel、token cancellation、処理失敗、rollback失敗を区別する。
- B-002: Safe Modeの表示語を全UI・NLS・spec・README・テストで統一する。
- B-003: 全公開operationがactivate()の単一Output Channelを使う。
- B-004: commitのoperationNameが具体的である。
- B-005: command側で入力形式・選択数・workspace・重複を先に検証する。
- B-006: 検証前にworkspace外symlink入力を読まない。
- B-007: crop configure全段階の失敗を通知とOutput Channelへ出す。
- B-008: command登録の正本とmanifest・menu・テストが一致する。

### Unresolved

- commit直後のcancelとrollbackの最終表示は0185/0187の仕様を参照する。

### Affected boundaries

VS Code command、operation、Safe Mode、Output Channel、workspace path、manifest。

### Allowed files

- `src/extension.ts`
- `src/commands/*.ts`
- `src/operations/*.ts`
- `src/security/workspace_path.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `test/extension.test.ts`
- `test/safe_mode*.test.ts`
- `test/*command*.test.ts`
- `test/workspace_path.test.ts`
- `docs/specs/internal/safe-mode.md`
- `docs/specs/internal/file-operation-security.md`
- `README.md`
- `README.ja.md`
- `AGENTS.md`
- `test/commit_conversion_outputs.test.ts`
- `test/convert_png_to_pdf.test.ts`
- `docs/tasks/0189-align-command-boundaries-and-output-channel.md`
- `docs/tasks/0190-reduce-conversion-command-review-surface.md`
- `docs/tasks/README.md`

### Related

- [Safe Mode仕様](../specs/internal/safe-mode.md)
- [ファイル操作security仕様](../specs/internal/file-operation-security.md)

### Evidence matrix

| Behavior | Test / verification                   | Evidence type               |
| -------- | ------------------------------------- | --------------------------- |
| B-001    | cancellation/error notification tests | command behavior test       |
| B-002    | NLS/spec/UI assertions                | consistency test            |
| B-003    | operation log capture                 | observable integration test |
| B-004    | commit call audit                     | static/source test          |
| B-005    | invalid selection tests               | command test                |
| B-006    | symlink preflight test                | path security test          |
| B-007    | configure failure tests               | command behavior test       |
| B-008    | manifest/registration test            | consistency test            |

### Dependencies

- Blocked by: 0187, 0188
- Blocks: 0190, 0191, 0192, 0193
- Can run in parallel with: none

### Not changing

- large conversion abstraction
- Webview rendering architecture
- dependency set

## Completion criteria

- 全commandが同一の区別・ログ境界を使う。
- 検証前readと登録表の不整合がない。
- taskの全Evidenceを実測する。

## Verification results

| Command                                                                                                                              | Result | Notes                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------- |
| `pnpm run check:all`                                                                                                                 | PASS   | runtime/test/Webview typechecks, RuleSync, task preflight, NLS |
| `./node_modules/.bin/vscode-test --grep "変換結果の反映処理\|Safe Modeダイアログの判断\|PNGからPDFへの変換処理\|拡張機能の基本動作"` | PASS   | 28 tests                                                       |
| `git diff --check`                                                                                                                   | PASS   | no whitespace errors                                           |
