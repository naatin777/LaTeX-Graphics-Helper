# v1 tooling file coverage

- 状態: 監査用draft
- 対象: Oxlint、Oxfmt、TypeScript、Vite / Vitest、Lefthook、root package scripts
- 目的: ruleの好みではなく、設定が現在のfile treeと実行境界を正しく表しているか確認する

## 1. Tooling principle

最初に確認する順序:

1. どのfileが対象か
2. どのruntime / boundaryとして扱うか
3. どのriskを検出するか
4. severityと自動修正をどうするか
5. local hook、CI、releaseで同じ意味を持つか

rule数や厳しさは、coverageとboundaryが正確になった後で判断する。

## 2. Oxlint coverage

### Root script

現在の`lint`は次を明示指定する。

```text
src
test
webview/apps
webview/shared
webview/vite.config.ts
webview/vitest.config.ts
oxlint.config.ts
```

### Configが想定する対象

`oxlint.config.ts`には次のoverrideがある。

- extension core: `src/application`, `src/operations`, `src/latex`, `src/config`
- extension runtime: `src/commands`, `src/webview`, `src/extension.ts`
- Webview app generic: `webview/apps/*/src`
- Webview shared
- Vite / Vitest config
- `scripts/**/*.mjs`
- tests

### Confirmed mismatches

| ID            | Config / script             | Observation                                                                                               | Effect                                                    | Candidate correction                                                                             |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| TOOL-LINT-001 | `scripts/**/*.mjs` override | root lint scriptは`scripts/`を渡さない                                                                    | package / NLS helper等がCI lint対象外                     | `scripts`をlint対象へ追加し、実warning inventoryを先に取る                                       |
| TOOL-LINT-002 | root JS config              | `.vscode-test.mjs`, `playwright.config.mjs`を渡さない                                                     | test runner configのsyntax / lint policyが外れる          | root configを明示追加するか、safeなrepository root globを検討                                    |
| TOOL-LINT-003 | stale app override          | `pdf-workbench`, `pdf-arranger`向け専用ruleを削除し、実在する`webview/apps/*/src`のgeneric ruleへ整理した | 現在のapp directoryとOxlint対象が一致する                 | Resolved in this naming audit; add an app-specific override only with a real dependency boundary |
| TOOL-LINT-004 | test override               | `test/**/*.ts`をNode envとして一括扱い                                                                    | Browser / Electron specもNodeとbrowser/electron双方を使う | Playwright test用overrideを別にし、globals / restricted importsを実runtimeに合わせる             |
| TOOL-LINT-005 | comments                    | 「logger導入後」等、未決将来案が設定コメントに残る                                                        | ruleの現在理由と将来案が混ざる                            | 現在の採用理由だけに絞る                                                                         |

### Rule-level observations

- `correctness`はerror、`suspicious`と`perf`はwarn。
- explicit rulesには`curly`, `eqeqeq`, `no-console`, type import, no-explicit-any等がある。
- architecture boundaryを`no-restricted-imports`でenforceしている。
- boundary ruleは価値があるが、現在のdirectory名と責務が先に確定している必要がある。
- `typescript/no-explicit-any`をtest全体でoffにしているため、unit testとcomplex VS Code mockの必要性を区別できない。

### Type-aware linting

現行v1では採用しない候補:

- repositoryはTypeScript 6.0.3
  -調査時点のOxlint type-aware要件と一致しない
- 追加dependencyとmigration costがある

再評価trigger:

- TypeScript 7系へのmigration
- floating promise等で現行lint / compiler / testが繰り返し見逃すEvidence
- representative branchでwarning数と実行時間を計測可能になったとき

## 3. Oxfmt coverage

### Root script

現在の`format`は次を対象にする。

- `src`
- `test`
- `webview/apps`
- `webview/shared`
- selected Vite / Vitest config
- `package.json`
- TypeScript configs
- Oxfmt / Oxlint configs

### Gaps and asymmetry

| ID           | Observation                                                          | Consequence                                                | Candidate decision                                                   |
| ------------ | -------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| TOOL-FMT-001 | README、`docs/**`、workflow YAML、Lefthook YAMLはCI `format`対象外   | pre-commitを通さない変更ではformat policyがenforceされない | docs / YAMLをCIでformatする価値とlarge diff riskを比較               |
| TOOL-FMT-002 | Lefthook pre-commitはstaged Markdown / CSS / HTML / JSONもformatする | local commitとCIの対象集合が一致しない                     | 意図的なlocal convenienceか、CI omissionかを明文化                   |
| TOOL-FMT-003 | root `.mjs` configがformat scriptへ含まれない                        | config style drift                                         | lintと同じcoverage policyへ揃える候補                                |
| TOOL-FMT-004 | Oxfmt configはMarkdown overrideを持つがCIはdocsを渡さない            | config capabilityと実行対象がずれる                        | overrideを残す理由をpre-commit用途としてコメントするか、CI対象へ追加 |

format対象をrepository全体へ急に広げると大量diffが発生するため、最初はcheck-only inventoryを取り、既存差分を別taskで正規化する。

## 4. TypeScript project coverage

### Extension production

`tsconfig.json`:

- `rootDir: src`
- strict、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`等を有効
- `include: ["src/**/*", "test"]`
- `exclude`にも`test`

実効上はproduction sourceだけだが、`include`の`test`は冗長で説明と一致しない。

Candidate correction:

```json
"include": ["src/**/*"]
```

これはbehavior変更ではなく設定意図の明確化だが、変更前に`tsc --showConfig`で実効file一覧を保存する。

### Extension tests

`tsconfig.test.json`:

- production configを継承
- `rootDir: .`
- `src/**/*`, `test/**/*`
- Mocha globals

現在の全root testを同じcompilationへ入れるため、Node / VS Code / Playwrightのruntime差を型projectが表していない。

移行後の候補:

- Node testとVS Code testを別tsconfigにする
- Playwright specを独立typecheckする
- ただしconfig数増加によるmaintenance costを比較する

### Webview production

`webview/tsconfig.json`:

- browser libs
- app source
- extension側のcrop protocolへpaths alias
- `vite.config.ts`も同じprojectに含む

Observation:

- Vite configはNode runtimeだがWebview browser projectに含まれる。
- `skipLibCheck`等は共有できるが、runtime globals / import policyはOxlintで補っている。

### Webview tests

`webview/tsconfig.test.json`は次をincludeする。

```text
src/**/*
test/**/*
vite.config.ts
```

一方、現在のWebview sourceは`apps/<app>/src`と`shared`にある。

これは次の可能性がある。

- app-specific configから利用する前提
- 古いroot Webview layoutの残存
- 現在test fileがなく実害が見えていない

`tsc --showConfig -p webview/tsconfig.test.json`とactual file listで確認するまで、正しいとも壊れているとも断定しない。

## 5. Test framework configuration

### VS Code test

- fixed VS Code 1.128.0
- `out/test/**/*.test.js`
- すべてのroot testをExtension Hostへ入れる

問題はversion固定ではなく、Node-only contractまでHostへ含めるfile globである。

### Playwright

1 configにBrowserとElectron projectがある。

利点:

- reporter、trace、timeoutを共有
- commandが単純

risk:

- BrowserとElectronでfixture / launch / artifact policyが異なる
- `testMatch`だけでruntimeを分けるためdirectory semanticsが重要

### Vitest

- dependencyあり
- shared `webview/vitest.config.ts`あり
- root formal scriptなし
- app-specific configの実在を今回確認できていない

Selection Gate:

- 実際にVitest testが存在するか
- Node pure test runnerとしても使うか
- Webview component test専用か
- Mochaとの二重framework cost

## 6. Lefthook and CI relationship

| Stage                | Current behavior                     | Alignment issue                                                             |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| pre-commit format    | staged TS/JS/JSON/MD/HTML/CSSをwrite | CI format対象より広い                                                       |
| pre-commit lint      | staged TS/JSのみ                     | root lint scriptよりfile選択がdynamicで、root configsもstagedなら対象になる |
| pre-push             | `check:all` + build                  | runtime testsは実行しない                                                   |
| CI Check             | `check:all`                          | pre-push staticと概ね一致                                                   |
| CI Test / Playwright | runtime tests                        | local pre-pushでは未実行                                                    |

これは必ずしも誤りではない。pre-pushを速く保ち、runtimeをCIへ任せる判断も成立する。

必要なのは、README / AGENTS / taskで「pre-push成功 = runtime verified」と誤認させないことである。

## 7. Proposed minimal tooling corrections

採用前の候補順:

1. `tsc --showConfig`とOxlint / Oxfmt dry-runでactual coverageを記録する
2. stale Webview app overrideを削除または現状へ同期する
3. `scripts/**/*.mjs`, `.vscode-test.mjs`, `playwright.config.mjs`をlint対象へ追加するexperiment
4. root configをformat対象へ追加する
5. production `tsconfig.json`の冗長includeを整理する
6. Webview test tsconfigのactual file listを確認し、不要なら削除、必要ならapp layoutへ合わせる
7. Node test experiment後にtest tsconfigをruntime別に分けるか判断する
8. docs / YAMLのCI formattingは独立判断にする

## 8. Do not do yet

- warningを一括errorへ上げる
- type-aware lintingを導入する
- ESLintを追加する
- repository全体をformatして巨大diffを作る
- architecture directoryをOxlint ruleに合わせて変更する
- test frameworkを一度に統一する
- config数を増やすこと自体を改善と扱う

## 9. Evidence needed for decision

- `oxlint`を未対象fileへ実行したwarning / error inventory
- `oxfmt --check`をdocs / root configへ実行したdiff量
- `tsc --showConfig`のactual files
- Webview Vitest test fileの実在数
- lint / typecheck wall-clock time
- CIとlocal hookのfailure履歴
- hidden promise / import boundary bugの実例
