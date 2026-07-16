# v1 development foundation audit

- 対象: `next/v1`を基準にしたv1開発基盤
- 監査branch: `audit/v1-foundation`
- 状態: Baseline draft / 採用判断前
- 判断owner: maintainer
- 関連task: [0198](../tasks/0198-audit-v1-development-foundation.md)
- 外部tool調査: [v1 test tooling research](../research/v1-test-tooling-2026-07.md)

## 1. Decision scope

今回決めたいことは、production codeの形ではない。

次の変更を評価できる前提を作る。

- どの文書を利用者向け仕様の正本とするか
- capabilityごとに、どの失敗を防ぐか
- どのtest runtimeが何を証明するか
- PR、full verification、releaseで必要なEvidenceは何か
- test directoryとscript名が何を意味するか
- Browser PlaywrightとPlaywright Electronをどう使い分けるか
- Oxlintをどの境界とriskへ適用するか
- AIへどのSkillまたはguideを使わせるか

今回決めないこと:

- class、factory object、関数などproduction codeの具体形
- test fileの実移動
- runnerの削除
- dependency追加
- CI変更
- 新しいSkillの実装

## 2. Actor and product value

### Primary actor

- 拡張機能を利用して、PDF・画像・Draw.ioを変換またはLaTeXへ挿入する利用者

### Engineering actor

- maintainer
- repository上で変更を行うAI coding agent

### Product value

利用者が、元ファイルや既存出力を意図せず失わずに、期待した形式・位置・ページ構成の成果物を得られること。

### Engineering value

変更がどの仕様を満たし、どのEvidenceで確認され、何が未確認かをmaintainerが短時間で判断できること。

## 3. Problem statement

現在は、安全性primitiveと多数の回帰testが追加されている一方、仕様、test runtime、directory、script、CI、lint boundary、AI workflowが同じ分類を共有していない。

その結果、次のリファクタリングを評価するときに、次の問いへ一貫して答えられない。

- 変更してはいけない利用者向けcontractは何か
- どのtestがそのcontractを証明しているか
- testが失敗したとき、production bug、runner bug、fixture driftのどれか
- browser testとElectron testのどちらが正本か
- `test:all`が本当に全必要Evidenceを含むか
- lint ruleが現在のdirectory boundaryを表しているか
- AIが設計前に何を調べるべきか

これは「コードが綺麗でない」という問題ではなく、変更判定baselineが不完全という問題である。

## 4. Evidence state

### Confirmed observations

#### O-001: `test:all`は名前と実行内容が一致しない

`package.json`の`test:all`は`test:vscode`とBrowser Playwrightだけを実行する。

含まれないもの:

- Playwright Electron
- packaged VSIX smoke
- Vitest
- cross-platform package test

`test:all`を「全てのrequired test」と解釈することはできない。

#### O-002: PRのrequired checkは静的checkだけである

`.github/workflows/check.yml`は`pnpm run check:all`だけを実行する。

現在の`check:all`はlint、format、TypeScript typecheck、NLS checkであり、runtime testを含まない。

したがって、通常PRがmerge可能かどうかと、実VS Codeまたは変換処理のruntime Evidenceは直接接続されていない。

#### O-003: release時に初めてcross-platform packaged smokeが実行される

`.github/workflows/release.yml`はtag push時にLinux、macOS、WindowsでVSIXをpackageし、Playwright Electronの単一specをpackaged VSIX smokeとして実行する。

release前のPRでは同じmatrixがrequiredではない。

#### O-004: `test/`直下に複数runtimeのtestが混在する

`.vscode-test.mjs`は`out/test/**/*.test.js`をExtension Development Host内のMochaで実行する。

`test/`には少なくとも次の性質のtestが混在している。

- pure data / protocol
- filesystem operation
- conversion operation
- VS Code command
- provider
- extension manifest
- security boundary
- integration helper
- Playwright Browser
- Playwright Electron

file pathだけでは、必要runtimeとoracleが判断しづらい。

#### O-005: Browser Playwrightの1 specへ複数責務が集約されている

`test/playwright/webview-pdf-rendering.spec.ts`は、独自HTTP server、PDF fixture生成、Host message simulation、PDF.js canvas、lazy rendering、high-DPI、layout、zoom、crop入力を扱う。

Browser runnerの必要性と、現在のspec分割が適切かは別問題である。

#### O-006: Electron specへUI、output、visual、packaging smokeが混在する

`test/playwright/electron/crop_pdf_configure.spec.ts`は、実VS Code起動、Webview操作、theme変更、visual snapshot、PDF出力、packaged VSIX確認、package内部moduleの直接importを1つのjourneyで扱う。

package内部moduleの直接importは、利用者journeyのoracleとは異なるため、分離候補である。

#### O-007: test policyは段階移行を記述するが完了条件が十分に追跡されていない

`docs/test-policy.md`は、実VS Code Webviewをvisualの正本とし、Electron側の同等coverageが安定した機能からBrowser runnerを削除すると記述する。

一方で、機能ごとのcoverage対応表、安定判定、削除条件、ownerが一箇所に存在しない。

#### O-008: Oxlint configとlint対象にdriftがある

`oxlint.config.ts`には`scripts/**/*.mjs`向けoverrideがあるが、`package.json`の`lint` scriptは`scripts/`を対象に含めない。

次も明示的なlint対象に含まれない。

- `.vscode-test.mjs`
- `playwright.config.mjs`
- package / release補助のroot-level JavaScript

また、`webview/apps/pdf-workbench`と`webview/apps/pdf-arranger`向けの専用overrideが残っており、現在のapp構成を表していない。

#### O-009: Vitestはdependencyと共通configがあるが正式scriptへ接続されていない

`vitest`と`webview/vitest.config.ts`は存在するが、root `package.json`にVitestを実行する正式scriptがない。

これは次のどちらかである可能性がある。

- 未完了の導入
- 現在不要な残存tool

現時点では判定できない。

#### O-010: specは局所的には強いがcapability catalogがない

`docs/specs/file-operation-security.md`はworkspace boundary、symlink、scratch、commit、rollback、backup、cleanupを具体的に定義している。

一方、各commandについて次を横断できるcatalogがない。

- input format
- output format
- required external tool
- output naming
- Safe Mode
- Undo
- cancellation
- failure guarantee
- platform condition
- corresponding test
- unverified Evidence

#### O-011: 一部specの対応済み一覧が現在の実装と同期していない可能性がある

`docs/specs/conversion-progress-and-cancellation.md`の「対応済み」は一部commandだけを列挙する。

現在のformat command全体との一致を、capability catalog作成時に確認する必要がある。

#### O-012: AGENTSは短くなったが、foundation auditへのroutingはない

現在の`AGENTS.md`はscope、implementation、test、安全性、refactoringの短い原則を持つ。

しかし、仕様、test strategy、tooling選定の前提が不明なtaskで、どのread-only workflowを先に使うかは定義されていない。

### Interpretations

#### I-001

現在の主問題はrunner数ではなく、各runnerが証明するcontractとrelease gateが一致していないことである。

#### I-002

Browser Playwrightを削除するか残すかは、Electronで置換できるかではなく、renderer固有oracleと実VS Code oracleを分けた後で判断すべきである。

#### I-003

pure testをExtension Hostから外すとfeedback speedとfailure isolationが改善する可能性がある。ただし、現状のtestが暗黙にVS Code runtimeへ依存している可能性があり、実測が必要である。

#### I-004

Oxlint ruleの強化より先に、現在lintしているfileとenforced boundaryを正確にする方が優先度が高い。

#### I-005

repository固有Skillは、コード生成手順よりも、problem framingとEvidence mappingに限定した方がハーネス肥大化を避けられる可能性がある。

### Hypotheses

- H-001: testをruntime別に分類すると、変更時に必要なtestだけを選びやすくなる
- H-002: Browser Playwrightをrenderer contractへ縮小すると、Electronとの重複が減る
- H-003: Electron specをcritical journey、visual、packaging smokeへ分けるとfailure diagnosisが改善する
- H-004: capability catalogを作ると、specとtestの欠落がproduction refactoring前に見つかる
- H-005: Oxlintのstale overrideと未lint fileを直すだけでも、設定の信頼性が改善する

これらは未検証であり、採用判断ではない。

## 5. Quality portfolio

### Primary quality

1. **User data safety**
   - 既存出力、入力、Undo backupを意図せず失わない
   - workspace外へ書き込まない

2. **Output correctness**
   - format、page、size、crop、orientation、visual markerが期待と一致する

3. **Release reproducibility**
   - packageしたVSIXでnative dependencyと主要journeyが動く
   - required platformの未実行を隠さない

4. **Change reviewability**
   - 変更したcontract、Evidence、未確認事項を短く追跡できる

### Secondary quality

- local feedback speed
- CI failure diagnosis
- test maintenance cost
- AIが読む範囲の小ささ

### Constraints

- VS Code Desktop extension
- Windows、macOS、Linuxのfilesystem / process差
- Draw.io、Ghostscript、pdftocairo等の外部tool
- Sharp等のnative dependency
- Webviewはbrowser-like runtime、HostはNode / VS Code runtime
- 一人maintainerで過剰な運用costを持てない

### Intentionally not optimized in this audit

- runnerを1種類に統一すること
- coverage percentage最大化
- test数最大化
- 全OSでvisual goldenを持つこと
- 全testを最速化すること
- schemaやvalidatorで文書を強制すること

## 6. Proposed capability-to-evidence model

以下は採用前の候補baselineである。

| Evidence layer | 主な対象 | 正本にできるもの | 正本にしないもの |
|---|---|---|---|
| Node / Vitest | pure logic、protocol、path、format判定、hash、option normalization | 入出力と失敗contract | VS Code API、実Webview、native package |
| VS Code Extension Host | activation、command、configuration、workspace、provider、notification、progress | Host integration | visual、実Webview theme、packaged VSIX |
| Browser Playwright | PDF.js、canvas、DPI、lazy render、scroll、zoom | Chromium renderer contract | VS Code theme、Host integration、release package |
| VS Code Electron | commandからWebview、theme、message bridge、critical journey | 実VS Code user journey | pure logicの全組合せ、package内部module API |
| Packaging smoke | installed VSIX、native dependency、offline behavior | 配布artifactの実行可能性 | UI詳細、全変換組合せ |
| Platform matrix | path、process、native dependency、package | required OS / architecture Evidence | 未実行platformの推測 |

## 7. Candidate test directory semantics

候補:

```text

test/
  fixtures/
  node/
  vscode/
  browser/
  electron/
  packaging/
  support/
```

代替案:

- pure testは`src/**/*.test.ts`へco-locateする
- Webview unit testは`webview/apps/<app>/src/**/*.test.tsx`へ置く
- integrationとE2Eだけをroot `test/`へ置く

選択基準:

- file pathからruntimeが明確か
- fixtureとsupport helperのownershipが明確か
- compile設定が単純か
- AIが無関係なtestを読み込まないか
- migration中に二重正本を作らないか

現時点ではdirectory名を採用しない。

## 8. Runner options and Selection Gates

### SG-001: Browser Playwrightを残すか

候補:

- A: 全てElectronへ移行しBrowser projectを削除
- B: renderer固有testだけBrowserへ残す
- C: 現状維持

必要Evidence:

- Browser testごとのcontract inventory
- Electronで同等oracleを実装した場合の実行時間
- 20回程度のflake観測
- failure時のdiagnostic比較
- PDF.js / high-DPI / lazy renderでBrowser固有価値が残るか

判断owner: maintainer

暫定状態: `conditional`

### SG-002: Electron testをrequiredにする範囲

候補:

- critical journey 1件だけPR required
- Webview変更時だけpath-filtered required
- nightly / manual full suite
- releaseだけ

必要Evidence:

- CI時間
- OSごとのflake
- download cacheの効果
- failure artifactの有用性

判断owner: maintainer

暫定状態: `conditional`

### SG-003: pure testをVS Code Hostから外すか

候補:

- Node / Vitestへ段階移行
- VS Code test-cliのlabelで分ける
- 現状維持

必要Evidence:

- `vscode` importのないtest inventory
- 代表20〜30件の移行experiment
- 実行時間とfailure差
- hidden VS Code dependencyの有無

判断owner: maintainer

暫定状態: `conditional`

### SG-004: Oxlint type-aware linting

現時点の阻害条件:

- repositoryはTypeScript 6.0.3
- 公式資料ではTypeScript 7.0+が必要
- 追加dependencyが必要

したがって、v1 foundation変更としては採用候補外とする。

TypeScript 7 migration後に、別experimentとして再評価する。

暫定状態: `blocked`

### SG-005: repository固有Skill

候補:

- A: Skillを作らず、task templateとguideだけを改善
- B: read-only foundation audit Skillだけ作る
- C: foundation audit、test strategy、technical researchの3 Skill
- D: inspired-mino suiteをそのまま導入

Dは、project scopeに対して過剰であり、参照suite自身もExperimentalであるため採用しない。

BまたはCの判断に必要なEvidence:

- 同種taskが何回発生するか
- AGENTSだけでは再現できない判断手順が何か
- Skillのmaintenance cost
- Skillなしのpromptで同等成果物を作れるか

判断owner: maintainer

暫定状態: `conditional`

## 9. Contradictions and gaps

| ID | Current records | Gap |
|---|---|---|
| C-001 | `test:all`という名前 | Electron、Vitest、packagingを含まない |
| C-002 | PR `Check` workflow | runtime testを実行しない |
| C-003 | test policyはElectronを実Webview正本とする | 機能別移行表とrequired gateがない |
| C-004 | Oxlint configはscripts overrideを持つ | lint commandはscriptsを含まない |
| C-005 | Oxlintに旧Webview app専用overrideがある | 現在のapp構成と一致しない |
| C-006 | Vitest dependencyとconfigがある | 正式scriptと役割がない |
| C-007 | specsは個別contractを持つ | capability横断catalogとtest traceがない |
| C-008 | Electron specはuser journey | packaged module直接importも同じspecで行う |
| C-009 | PROJECT_STATEはcross-platform verificationを最優先 | foundation auditがCurrent Taskへ反映されていない |

## 10. Recommended sequence

### Phase 1: baseline completion

production codeとtest配置を変えずに次を作る。

1. capability catalog
2. spec / test trace matrix
3. test inventory by runtime and oracle
4. CI Evidence map
5. tooling file coverage inventory
6. unknown / contradiction list

### Phase 2: decisions

個別ADRで次を決める。

1. required test Evidence policy
2. test directory semantics
3. Browser Playwrightの残存範囲
4. Electron testのrequired範囲
5. packaging smokeの責務
6. Oxlint対象fileとboundary policy
7. project Skill routing

一つのADRで全項目を決めない。

### Phase 3: reversible transition

小さいtaskに分ける。

1. script名と実行内容を一致させる
2. Oxlintのstale overrideと未lint fileを修正する
3. pure testの小規模移行experiment
4. Browser specをrenderer contract単位へ分割する
5. Electron specをcritical journey、visual、packagingへ分割する
6. 機能単位でBrowser coverageの削除可否を判断する
7. required CIを段階的に変更する

### Phase 4: production refactoring reevaluation

baselineとEvidence policyが決まった後に、class、factory object、operation boundary、directory構造などproduction codeの設計を再評価する。

## 11. Audit readiness

### Subject verdict

`conditional`

### Ready

- 問題と候補手段を分離した
- 現在の主要なtest runnerとtooling driftを記録した
- quality portfolioを仮定として明示した
- 即時に全面移行しない理由を記録した

### Remaining obligations

- capability catalogを実装とmanifestから作る
- 全test fileをruntime / oracle / contractでinventoryする
- CI workflow全体をrequired / release / manualへ分類する
- BrowserとElectronの重複coverageをtest case単位で比較する
- maintainerがrequired platformとquality priorityを承認する

これらが完了するまで、test runnerの全面置換やproduction architectureの大規模変更を開始しない。
