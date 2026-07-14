Please also reference the following rules as needed. The list below is provided in TOON format, and `@` stands for the project root directory.

rules[5]:
  - path: @.codex/memories/01-work-scope.md
    description: 作業範囲と変更方針
    applyTo[1]: **/*
  - path: @.codex/memories/02-tests.md
    description: テストと検証の方針
    applyTo[1]: **/*
  - path: @.codex/memories/03-documentation.md
    description: コメント、言語、外部調査の方針
    applyTo[1]: **/*
  - path: @.codex/memories/04-git-pr.md
    description: Git、PR、作業報告の方針
    applyTo[1]: **/*
  - path: @.codex/memories/05-auto-fix.md
    description: lint/format自動修正の方針
    applyTo[1]: **/*

# AGENTS.md

このファイルは、Codex / AI coding agent に守ってほしいプロジェクト固有の作業ルールです。
