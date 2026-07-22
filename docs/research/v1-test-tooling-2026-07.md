# v1 test tooling research

- 調査日: 2026-07-16
- 対象branch: `audit/v1-foundation`（`next/v1`から分岐）
- 目的: test runner、VS Code integration、Electron automation、Oxlint、Mino-inspired Skillを選ぶ前提を確認する
- 状態: 調査結果。採用判断の正本ではない

## Repositoryで確認したversionと構成

`package.json`では次を使用している。

- `@playwright/test`: `^1.61.0`
- `@vscode/test-cli`: `^0.0.12`
- `@vscode/test-electron`: `^3.0.0`
- `oxlint`: `^1.70.0`
- `typescript`: `^6.0.3`
- `vitest`: `^4.1.9`

現在のscriptは次の役割になっている。

- `test:vscode`: build後、`vscode-test`で`out/test/**/*.test.js`を実VS Code Extension Host内で実行する
- `test:playwright`: browser projectだけを実行する
- `test:playwright:electron`: VS Code Electron projectを実行する
- `test:all`: `test:vscode`とbrowser Playwrightだけを実行し、ElectronとVitestを含めない

## VS Code extension test

VS Code公式documentationは、Extension Development Host内で実行するテストをintegration testとして説明している。VS Code APIへ完全にアクセスでき、`@vscode/test-cli`と`@vscode/test-electron`を標準的なDesktop extension testの構成として案内している。

確認できたこと:

- Extension Host testはunit testの代替ではなく、VS Code integrationを確認する層である
- `@vscode/test-cli`はMochaを使用する
- `files`で実行対象を分離でき、複数configやlabelも利用できる
- VS Code API、command、workspace、configuration、extension activationの確認に適する

公式資料:

- https://code.visualstudio.com/api/working-with-extensions/testing-extension
- https://github.com/microsoft/vscode-test

## Playwright Electron

Playwright公式APIではElectron automationは現在もExperimentalとして分類され、`_electron` namespaceから利用する。

確認できたこと:

- 実Electron windowをPlaywright Locatorで操作できる
- Electron main processの評価も可能
- native dialogは通常のbrowser dialogとは異なり、main process側でstubが必要になる場合がある
- Experimental APIへ依存するため、全testの唯一のrunnerにする場合は互換性とfailure diagnosisのcostを別途評価する必要がある

公式資料:

- https://playwright.dev/docs/api/class-electron

## Browser Playwright

Browser Playwrightは実VS Code Hostを含まないが、Chromium renderer上で次を比較的速く確認できる。

- PDF.js canvas rendering
- device pixel ratio
- lazy rendering
- scroll / zoom
- DOM eventとlayout
- browser runtime固有の問題

ただし、現在のbrowser testはHost message simulation、HTTP server、fixture生成、layout、protocol、PDF.js integrationを1つの大きなspecへ集約している。Browser runnerを残すかどうかとは別に、現在の責務混在は監査対象とする。

## Oxlint

現在の`oxlint.config.ts`はcorrectnessをerror、suspicious / perfをwarnにし、import境界を多数設定している。

確認できたこと:

- `scripts/**/*.mjs`向けoverrideがある一方、現在の`lint` scriptは`scripts/`、`.vscode-test.mjs`、`playwright.config.mjs`を対象に含めていない
- 初期調査時点では`webview/apps/pdf-workbench`と`webview/apps/pdf-arranger`向けの専用overrideが残っていた。2026-07-22の命名auditで削除し、現行`webview/apps/*/src`のgeneric overrideへ整理した。
- 一般的な`webview/apps/*/src/**` overrideは存在する

Oxlintのtype-aware lintingについて公式資料から確認したこと:

- type-aware ruleは`oxlint-tsgolint`という追加dependencyを必要とする
- `options.typeAware: true`または`--type-aware`で有効化する
- `no-floating-promises`などを利用できる
- 現行documentationではTypeScript 7.0+を必要とする
- repositoryはTypeScript 6.0.3のため、現時点で即時有効化する前提は成立しない
- coverage、性能、compatibilityは継続改善中と記載されている

したがって、type-aware lintingは「有効にすべき設定」ではなく、TypeScript migration、追加dependency、実行時間、検出結果を含む後続experiment候補とする。

公式資料:

- https://oxc.rs/docs/guide/usage/linter/type-aware.html

## inspired-mino-design-skills

参照repositoryは、技術を先に選ばず、problem、目的、前提、成功条件、quality scenario、contract、Evidenceを先に整理する方針を提供している。

一方、参照repository自身はExperimental / Previewと明記し、native macOS fixture runnerの未解決failureとbehavioral evidence未実行を公開している。

採用可能なもの:

- problemとcandidate meansの分離
- 観測、解釈、前提、仮説、unknown、contradictionの分離
- valueからquality scenario、option、validationまでのtrace
- AI説明ではなくEvidenceで判定すること
- 最終priorityと不可逆判断を人間が所有すること

そのまま採用しないもの:

- suite全体のschema
- validatorやrelease gate
- repositoryへ多数のSkillをコピーすること
- 現projectに不要なbusiness domain分類

参照資料:

- https://github.com/my-take-dev/inspired-mino-design-skills
- https://github.com/my-take-dev/inspired-mino-design-skills/blob/main/.agents/skills/mino-problem-framing/SKILL.md
- https://github.com/my-take-dev/inspired-mino-design-skills/blob/main/.agents/skills/mino-architecture-quality-strategy/SKILL.md

## 調査から確定できないこと

以下はrepositoryの実測または人間判断が必要であり、このresearch noteでは決めない。

- Browser Playwright固有のcoverageがElectronで同等以上に安定して置換できるか
- Electron testを全Webview testの正本にした場合のCI時間とflakiness
- pure testをExtension HostからNode / Vitestへ移した場合の実行時間改善
- v1 releaseで必須とするOSとarchitecture
- visual goldenをLinuxだけにするか
- packaging smokeをどのeventでrequiredにするか
- repository固有Skillを実装するか、task templateとguideだけで足りるか

## 再確認条件

次の場合は公式資料とこの記録を再確認する。

- Playwright ElectronがExperimentalではなくなった
- `@vscode/test-cli`または`@vscode/test-electron`のmajor versionを更新する
- TypeScript 7へ移行する
- Oxlint type-aware lintingを試すtaskを開始する
- test runnerまたはCI required checksを変更する
