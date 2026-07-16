# Task: Node-level testの実行基盤を決定する

## Status

In Progress

3 OSのremote GitHub Actions Evidenceを確認済み。tested subsetのNode runtime採否、CI jobの恒久化、Hostとの重複期間、required statusは未決定のため、0201はIn Progressを維持する。

## Goal

Node-level contractをどのruntimeで実行するか決定し、local script、CI、internal test policyへ反映する。

## Deliverable

- [Node test runtime evaluation](../records/node-test-runtime-evaluation.md)
- [Internal test policy](../specs/internal/test-policy.md)

## Scope

- task 0200で選定した5 test sources / 18 cases / 31 assertion expressions
- plain Node + Mochaの既存experiment scriptと3 OS CI job
- Host、Node、Browser、VS Code Electronのoracle境界
- product specification、internal specification、record、taskの役割分離

## Phases

### Phase 1: Local experiment

- [x] plain Node + Mochaで小さいsubsetを実行
- [x] Hostとcorrectness、timing、diagnosticsを比較

### Phase 2: Cross-platform CI

- [x] Linux結果を取得
- [x] macOS結果を取得
- [x] Windows結果を取得
- [x] case数とskip数を記録
- [x] job durationの未取得を記録し、推測しない

#### Remote Evidence

PR #356のTest workflow run [#444](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29506886218)で、各OSの`node-test-experiment` jobがNode 22でsuccessした。job durationは取得できるEvidenceに含まれていない。

| OS      | Result | Cases | Skipped | Node |
| ------- | ------ | ----: | ------: | ---: |
| Linux   | Pass   |    18 |       0 |   22 |
| macOS   | Pass   |    18 |       0 |   22 |
| Windows | Pass   |    18 |       0 |   22 |

### Phase 3: Decision

- [ ] tested subsetでNode runtimeを採用するか決定
- [ ] experimental CI jobを維持するか決定
- [ ] Hostでも同じtestを一時的に実行し続けるか決定
- [ ] script名を正式化するか決定

### Phase 4: Apply

- [ ] internal test policyへ反映
- [ ] package scriptとCIの状態を決定内容に合わせる
- [ ] experiment recordへ最終結果を記録

## Decision boundary

product specificationは利用者に保証する挙動、internal specificationは開発時に守るprotocol・invariant・oracle方針、recordは実験Evidence、taskは成果と進捗を正本とする。CI成功だけでNode runtime正式採用とはしない。

## Completion conditions

- 3 OSのremote結果を確認した
- Node runtimeのtested subsetに対する採否を決定した
- CI jobをkeep/removeする判断をした
- Hostとの重複期間を決定した
- internal test policyへ反映した
- recordへEvidenceと判断を記録した
