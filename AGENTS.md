Please also reference the following rules as needed. The list below is provided in TOON format, and `@` stands for the project root directory.

rules[5]:

- path: @.codex/memories/01-work-scope.md
  description: 作業範囲と変更方針
  applyTo[1]: \*_/_
- path: @.codex/memories/02-tests.md
  description: テストと検証の方針
  applyTo[7]: src/**/\*,test/**/_,webview/\*\*/_,tsconfig*.json,vitest.config.ts,webview/tsconfig*.json,webview/vitest.config.ts
- path: @.codex/memories/03-documentation.md
  description: コメント、言語、外部調査の方針
  applyTo[6]: docs/\*_/_,README.md,README.ja.md,PROJECT_STATE.md,package.nls.json,package.nls.ja.json
- path: @.codex/memories/04-git-pr.md
  description: Git、PR、作業報告の方針
  applyTo[7]: .github/**/\*,scripts/**/_,package.json,pnpm-lock.yaml,pnpm-workspace.yaml,lefthook.yml,.rulesync/\*\*/_
- path: @.codex/memories/05-auto-fix.md
  description: lint/format自動修正の方針
  applyTo[9]: src/**/\*,webview/**/_,test/\*\*/_,_.json,_.jsonc,_.ts,_.mjs,_.yml,_.yaml

# AGENTS.md

このファイルは、Codex / AI coding agent に守ってほしいプロジェクト固有の作業ルールです。
