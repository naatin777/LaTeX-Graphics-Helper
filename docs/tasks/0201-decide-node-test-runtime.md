# Task: Node-level testの実行基盤を決定する

## Status

Done

3 OSのremote GitHub Actions EvidenceとローカルのNode / Extension Host実行結果を確認し、tested subsetのNode runtime採用、CI jobの恒久化、Hostとの重複終了、formal script名を決定・適用した。required statusは今回設定しない。

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

- [x] tested subsetでNode 22 + MochaのNode runtimeを正式採用すると決定
- [x] 3 OSのNode CIを`node-test`として恒久的に維持すると決定
- [x] Hostで同じtestを実行し続けず、選定5 filesをこのPRで除外すると決定
- [x] script名を`build:test:node` / `test:node`へ正式化すると決定

#### Final decision

- tested subsetはNode runtimeを正式採用する
- runnerはMochaを維持する
- Node CIはLinux、macOS、Windowsで恒久的に維持する
- Host overlapは今回終了する
- required statusは今回設定しない
- Vitest comparisonとNode subset expansionは今回行わない

### Phase 4: Apply

- [x] internal test policyへruntime ownershipとoracle境界を反映
- [x] package script、Host exclusion、CI jobを決定内容に合わせる
- [x] recordへ3 OS Evidenceと最終判断、採用理由、残るunknownを記録

## Decision boundary

product specificationは利用者に保証する挙動、internal specificationは開発時に守るprotocol・invariant・oracle方針、recordは実験Evidence、taskは成果と進捗を正本とする。CI成功だけでNode runtime正式採用とはしない。

## Completion conditions

- [x] 3 OSのremote結果を確認した（Linux/macOS/Windows、各18 cases / 0 skipped / Node 22）
- [x] Node runtimeのtested subsetに対する採否を決定した（採用）
- [x] CI jobをkeep/removeする判断をした（`node-test`として恒久維持）
- [x] Hostとの重複期間を決定した（このPRで終了）
- [x] internal test policyへ反映した
- [x] recordへEvidenceと判断を記録した

## Verification

- `pnpm run test:node`: Node 22 + Mocha、5 files / 18 cases / 0 skipped、pass
- `pnpm run test:vscode`: Extension Host、193 passing、除外した5 filesのsuite/caseは実行ログに現れなかった
- `pnpm test`: Node 18 + Extension Host 193、pass
- `pnpm run test:all`: Node 18 + Extension Host 193 + Browser Playwright 18、pass
- Remote Evidence: Linux、macOS、Windowsの`node-test-experiment`が各18 cases / 0 skipped / Node 22でsuccess
