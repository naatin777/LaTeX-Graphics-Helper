# AIハーネスとStop hookを検証専用にする

## Status

Todo

## Change Contract

### Problem

dirty worktreeでStop hookが常にskipし、clean treeでは全体自動修正を行うため、task境界とRuleSyncの検証ハーネスとして機能していない。

### Allowed behaviors

- B-001: Stop hookは自動修正せず、Current Task、Allowed files、RuleSync、軽量checkをJSONで報告する。
- B-002: task preflightはCurrent Taskの一意性・必須section・Status・変更範囲・linked spec/ADRを検証する。
- B-003: runtime logをworkspace stagingへ保存しない。
- B-004: Closed WorldとEvidence matrix対応をRuleSync正本に明記する。
- B-005: generated Codex/Claude/Cursor/Copilot ruleが同期する。

### Unresolved

- user既存差分とtask変更の分離方法は、利用可能なGit base情報を確認して最小仕様を決める。

### Affected boundaries

RuleSync、task markdown、Git diff、Stop hook、cross-platform Node script。

### Allowed files

- `.rulesync/rules/*.md`
- `.rulesync/hooks.json`
- `.rulesync/hooks/stop-fix.sh`
- `scripts/validate-current-task.mjs`
- `scripts/harness-stop.mjs`
- `package.json`
- `test/stop_fix_hook.test.ts`
- `test/validate_current_task.test.ts`
- generated rule files under `AGENTS.md`, `.claude/`, `.cursor/`, `.github/`
- `docs/adr/0014-define-ai-development-harness.md`
- `docs/tasks/0188-build-task-preflight-and-stop-harness.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification             | Evidence type                   |
| -------- | ------------------------------- | ------------------------------- |
| B-001    | dirty worktree Stop hook test   | harness behavior test           |
| B-002    | malformed/current task fixtures | script test                     |
| B-003    | log path audit                  | source test                     |
| B-004    | generated rule content check    | RuleSync check                  |
| B-005    | `rulesync:check`                | generated artifact verification |

### Dependencies

- Blocked by: 0187
- Blocks: 0189, 0194
- Can run in parallel with: none

### Not changing

- production conversion behavior
- automatic changes to user files
- new dependencies or full Markdown parser

## Completion criteria

- dirty worktreeでも検証が実行される。
- `harness:check`と`rulesync:check`が正式導線へ接続される。
- task preflightの成功・失敗を実測する。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
