---
name: lgh-task-runner
description: Use when working on a LaTeX Graphics Helper docs/tasks item from start to handoff, including reading the current task, keeping one task scope, choosing verification, optionally delegating bounded read-only review to Luna, and preparing commit/PR handoff. Do not use for ordinary code edits that are not tied to a docs/tasks task.
---

# LGH Task Runner

Use this skill to run one LaTeX Graphics Helper task with minimal, scoped process. Keep it procedural and short; project rules stay in `AGENTS.md` / `.codex/memories`, durable decisions stay in ADR/specs, and task-specific work stays in `docs/tasks`.

## Start

1. Read `PROJECT_STATE.md`, `docs/tasks/README.md`, and the target task file.
2. Confirm exactly one task is in scope. If `Current Task` is `なし`, use the task explicitly requested by the user or the first relevant Todo they asked to continue.
3. Read only directly related ADR, spec, research, or source files.
4. If the task is unclear, conflicts with another task, or would expand scope, stop and ask the user before editing.
5. Work from a task branch based on the latest `next/v1`; never push directly to `next/v1`.

## Scope boundary

Use this split:

- `AGENTS.md` / RuleSync rules: always-on short constraints.
- Task file: current objective, allowed files, completion conditions, verification.
- ADR/spec: durable design and user-visible behavior.
- Research note: time-sensitive external facts and official-source checks.
- This skill: repeated workflow, risk triage, delegation, verification choice, handoff shape.
- Hooks/rules: mechanical enforcement only, not design judgment.

Do not copy long rule text into this skill. Link or read the source document instead.

## Risk triage

Choose the smallest workflow that fits the task.

- Docs-only or planning task: edit allowed docs only, run `git diff --check`.
- Normal implementation task: inspect task, relevant code, and tests; run `pnpm run check` plus targeted tests.
- Boundary-heavy task: before implementation, name the boundary and define input, output, throw behavior, redaction, fallback, and failure guarantee.

Boundary-heavy includes security, path handling, workspace/scratch isolation, external CLI, Webview message boundaries, undo/safe mode, config parsing, unknown input, and cross-OS compatibility.

Only add hostile-object or malformed-input tests at real `unknown` or external-message boundaries. Do not force hostile tests onto ordinary internal typed data.

## Luna delegation

Delegate only when the subtask is bounded and does not block the immediate local step.

Good Luna `xhigh` tasks:

- read-only repository investigation;
- docs / ADR / task consistency review;
- CI log or test failure analysis;
- test-gap, boundary-gap, or patch-chain review;
- a small patch with exclusive file ownership.

Do not delegate:

- final decisions about specs, security, dependencies, public behavior, Git, or PRs;
- user-confirmation decisions;
- destructive commands or external publishing;
- edits to the same files another agent is editing;
- work that changes the task objective.

Treat Luna output as a proposal. Codex must verify evidence, diff, and unknowns before adopting it.

## Delegation prompt shape

Include:

- task ID and objective;
- allowed files or read-only status;
- explicit ownership and non-target files;
- risk category;
- prohibited actions;
- expected output format;
- requirement to list unverified assumptions;
- statement that Codex keeps final integration and Git/PR judgment.

For implementation workers, say they are not alone in the codebase and must not revert unrelated edits.

## Verification

Use the task's `確認方法` first. If it is insufficient, add the smallest relevant check and report why.

Default mapping:

- docs / task / ADR / research only: `git diff --check`
- RuleSync-generated files touched: RuleSync check/generate command required by the task
- TypeScript or package behavior: `pnpm run check`
- VS Code command behavior: targeted `pnpm run test` / `pnpm run test:vscode`
- Webview visual behavior: targeted Playwright or Electron Playwright command

Do not use `CI=true` locally unless reproducing CI-only behavior; record the reason when doing so.

## Git and PR

- Branch: create from latest `next/v1` after checking the worktree.
- Commit: only after verifying the task-scoped diff; use Conventional Commits in English.
- Push: push only the task branch, never `next/v1`.
- PR: base is `next/v1`; title is English Conventional Commit style; body follows `.github/PULL_REQUEST_TEMPLATE.md`.
- Do not reply to, resolve, or submit GitHub review comments unless the user explicitly asks.

## Handoff

Report:

- what changed;
- why it changed;
- verification performed;
- unverified items;
- whether behavior/spec changed;
- next task or blocker.

Use the information roles:

- production code: How;
- tests: What;
- commit / PR / ADR: Why;
- code comments: Why not.
