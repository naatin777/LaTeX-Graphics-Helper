# Task: Node test runtimeを小規模検証する

## Status

Done

## Goal

Node-level testをplain Node + Mochaで実行できるか、小さいsubsetで検証する。

## Result

同じ5 test sources / 18 cases / 31 assertion expressionsを維持したまま、macOSローカルでNode実行できた。

## Deliverable

- [Node test runtime evaluation](../records/node-test-runtime-evaluation.md)

## Completed scope

- local correctness比較
- timing比較
- failure diagnostics比較
- dependency graph確認

## Not decided

- cross-platform correctness
- Node runtime正式採用
- CIでの扱い
- Vitest
