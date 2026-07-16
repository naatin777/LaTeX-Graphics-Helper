# v1 development foundation audit

- 対象: `next/v1`を基準にしたv1開発基盤
- 監査branch: `audit/v1-foundation`
- 状態: Baseline draft / 採用判断前
- 判断owner: maintainer
- 関連task: [0198](../tasks/0198-audit-v1-development-foundation.md)

## 1. Purpose

今回の目的はproduction codeを綺麗にすることではない。

次の変更を評価できる共通baselineを作る。

- どの利用者向けcontractを守るか
- どの文書を仕様の正本とするか
- capabilityごとにどの失敗を防ぐか
- どのtest runtimeが何を証明するか
- PR、full verification、releaseで必要なEvidenceは何か
- test directoryとscript名が何を意味するか
- Browser PlaywrightとPlaywright Electronをどう使い分けるか
- Oxlint、Oxfmt、TypeScript configが現在のfile treeを正しく表しているか
- AIへどのSkillまたはread-only workflowを使わせるか

今回決めないこと:

- class、factory object、関数などproduction codeの具体形
- test fileの実移動
- Browser Playwrightの削除
- Playwright Electronへの全面移行
- dependency追加
- CI workflow変更
- 新しいSkillの実装

## 2. Problem frame

### Actor

- Primary: PDF・画像・Draw.ioを変換またはLaTeXへ挿入する利用者
- Engineering: maintainer、repository上で変更を行うAI coding agent

### Product value

利用者が、元ファイルや既存出力を意図せず失わずに、期待した形式・位置・ページ構成の成果物を得られること。

### Engineering value

変更がどの仕様を満たし、どのEvidenceで確認され、何が未確認かをmaintainerが短時間で判断できること。

### Observed problem

安全性primitiveと多数の回帰testは存在するが、仕様、test runtime、directory、script、CI、lint boundary、AI workflowが同じ分類を共有していない。

そのため、次の問いへ一貫して答えにくい。

- 変更してはいけない利用者向けcontractは何か
- どのtestがそのcontractを証明しているか
- test failureがproduction bug、runner bug、fixture driftのどれか
- BrowserとElectronのどちらが何の正本か
- `test:all`が何を意味するか
- lint / format / typecheckが実際にどのfileを覆うか
- AIが実装前に何を調べるべきか

問題はrunner数やclass数ではなく、**変更判定baselineが不完全なこと**である。

## 3. Audit artifacts

詳細は目的別の文書へ分離する。

| Artifact | Purpose |
|---|---|
| [Capability catalog](capability-catalog.md) | public capability、cross-cutting guarantee、delivery capabilityを一覧化する |
| [Spec / test trace](spec-test-trace.md) | contractからimplementation、test、runtime、gapを追跡する |
| [Test runtime inventory](test-runtime-inventory.md) | current runnerとcontractually required runtimeを分ける |
| [CI Evidence map](ci-evidence-map.md) | Check、Test、Playwright、ReleaseのEvidenceとgateを整理する |
| [Tooling file coverage](tooling-file-coverage.md) | Oxlint、Oxfmt、TypeScript、Vitest、Lefthookの対象driftを整理する |
| [External tooling research](../research/v1-test-tooling-2026-07.md) | Playwright Electron、VS Code test、Oxlintの外部仕様を記録する |

このfileは判断用indexであり、上記の詳細を重複して正本化しない。

## 4. Confirmed observations

### O-001: `test:all`は全Evidenceを意味しない

現在の`test:all`はVS Code Extension Host testとBrowser Playwrightを実行する。

含まれないもの:

- Playwright Electron
- packaged VSIX smoke
- Vitest
- cross-platform package test

したがって、名前だけから「全required test」と解釈できない。

### O-002: PRにはruntime Evidenceが存在する

初稿では`.github/workflows/check.yml`だけを確認し、「通常PRはruntime testへ接続されていない」と記録した。これは誤りだった。

実際には:

- `check.yml`: static check
- `test.yml`: Linux、macOS、WindowsのVS Code test。LinuxではElectron projectも実行
- `playwright.yml`: Linux、macOS、WindowsのBrowser Playwright

がPRで起動する。

問題はruntime testが存在しないことではない。

- workflowとlocal scriptの意味が分散している
- VS Code suiteへNode-only contractとHost integrationが混在する
- branch protection上のrequired statusは未確認
- packaged smokeはrelease時まで実行されない

ことが問題である。

### O-003: packaged artifactの3 OS Evidenceはrelease時に取得する

`release.yml`はtag push時にLinux、macOS、WindowsでVSIXをpackageし、installed VSIXをElectronで実行する。

通常PRでは3 OS packaged smokeを実行しない。

これは必ずしも誤りではないが、release前に初めてpackage regressionが判明するriskとCI costを比較する必要がある。

### O-004: test pathからruntimeとoracleを判断しにくい

`.vscode-test.mjs`は`out/test/**/*.test.js`をExtension Hostへ入れる。

その中には少なくとも次が混在する。

- pure data / protocol
- Node filesystem safety
- conversion operation
- VS Code command / provider
- manifest / NLS

BrowserとElectronは`test/playwright/`配下にあるが、各spec内でも複数責務が混在する。

### O-005: Nodeへ移せる可能性が高い安全性testがある

直接`vscode`を必要としない代表例:

- source format
- Crop protocol
- streaming file hash
- external tool runner
- staged batch
- commit / rollback
- artifact cleanup
- PNG→PDF operation
- Draw.io path boundary
- merge operation
- Clipboard save operation

これらは重要度が低いからNode候補なのではない。むしろ安全性criticalだから、VS Code起動failureから分離して高速に診断できる可能性がある。

移行可否はrepresentative experimentで判断する。

### O-006: Browser specへrenderer以外の責務も集まる

Browser PlaywrightにはPDF.js、canvas、DPI、lazy render、scroll、zoomを確認する価値がある。

一方、Host message simulationや大きなuser journeyはElectronと重複しやすい。

Browser runnerの存在可否と、現在の1000行超specの分割可否は別の問題である。

### O-007: Electron specへ4種類のEvidenceが混在する

現在のElectron specは次を一つのflowで扱う。

- real VS Code critical journey
- dark / light visual snapshot
- installed VSIX / offline behavior
- package内部module importとSharp native load

critical journey、visual、packaging smokeはfailure ownerと実行頻度が異なるため、分離候補である。

### O-008: specは局所的に強いが横断catalogがなかった

workspace boundary、Safe Mode、rollback、scratch、Crop Configureなどの個別specは詳細である。

一方、各commandについて次を横断するrecordがなかった。

- input / output
- external tool
- naming
- Safe Mode / Undo / cancellation
- failure guarantee
- platform condition
- test Evidence
- unverified Evidence

監査branchで[capability catalog](capability-catalog.md)と[spec / test trace](spec-test-trace.md)を作成した。

### O-009: 一部specの対象一覧が現行実装と同期していない

- `safe-mode.md`の「初期対象」
- `undo-last-conversion.md`の対象command
- `conversion-progress-and-cancellation.md`の「対応済み」

は、現在のgeneric output conversion command群を完全には表していない。

履歴として残すのか、現行対象へ更新するのかを決める必要がある。

### O-010: Tooling configと実対象にdriftがある

確認済みの例:

- Oxlintには`scripts/**/*.mjs` overrideがあるがroot lint scriptは`scripts/`を渡さない
- `.vscode-test.mjs`と`playwright.config.mjs`がroot lint / format対象外
- 旧Webview app名向けOxlint overrideが残る
- production `tsconfig.json`のinclude / excludeに冗長な`test`指定がある
- Webview test tsconfigのincludeが現在のapp layoutを表すか未確認
- Vitest dependency / shared configはあるがformal root scriptがない
- Lefthook pre-commitとCI formatの対象集合が異なる

rule強化より先にactual file coverageを正確にする。

### O-011: AGENTSは短いがfoundation workflowへのroutingはない

現在の`AGENTS.md`は短く、scope、安全性、test、refactoringの基本原則として妥当である。

ただし、仕様・test strategy・toolingの前提が不明なtaskで、実装前にread-only auditを選ぶroutingは定義されていない。

AGENTSを再び巨大化せず、guideまたは最小Skillへの短いroutingを候補にする。

## 5. Quality portfolio

### Primary

1. User data safety
   - 元入力、既存出力、Undo backupを意図せず失わない
   - workspace境界を越えない
2. Output correctness
   - format、page、size、crop、orientation、visual markerが期待と一致する
3. Release reproducibility
   - packageしたVSIXでnative dependencyと主要journeyが動く
   - required platformの未実行を隠さない
4. Change reviewability
   - contract、Evidence、未確認事項を短く追跡できる

### Secondary

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

### Intentionally not optimized now

- runnerを1種類に統一すること
- coverage percentage最大化
- test数最大化
- 全OSでvisual goldenを持つこと
- 全testを最速化すること
- schemaやvalidatorで文書を強制すること

## 6. Candidate Evidence model

採用前の候補:

| Layer | Primary contract | Not source of truth for |
|---|---|---|
| Node / Vitest | pure logic、protocol、path、filesystem transaction、child process | VS Code API、actual Webview、package |
| VS Code Extension Host | activation、command、configuration、workspace、provider、notification | visual、actual Webview theme、installed VSIX |
| Browser Playwright | PDF.js、canvas、DPI、lazy render、scroll、zoom | VS Code theme、Host bridge、package |
| VS Code Electron | commandからWebview、theme、message bridge、critical journey | pure logicの全組合せ、package内部module API |
| Packaging smoke | installed VSIX、native dependency、offline behavior | UI詳細、全変換組合せ |
| Platform matrix | path、process、native module、packageのnative OS Evidence | 未実行platformの推測 |

## 7. Selection Gates

### SG-001: Browser Playwright

候補:

- 全てElectronへ移行する
- renderer固有contractだけBrowserへ残す
- 現状維持

必要Evidence:

- Browser test caseごとのcontract inventory
- Electronで同等oracleを実装した場合の時間
- repeated runのflake
- failure diagnostics
- PDF.js / high-DPI / lazy renderのBrowser固有価値

暫定: `conditional`

### SG-002: Electron required scope

候補:

- Linux critical journeyを全non-doc PRで実行
- related path変更時だけ実行
- full suiteはmanual / scheduled
- releaseだけ

必要Evidence:

- CI時間
- OS別flake
- cache効果
- artifactの診断価値

暫定: `conditional`

### SG-003: Node test migration

候補:

- representative 7 testをNode / Vitestへ移すexperiment
- VS Code test-cli内でlabel分離
- 現状維持

必要Evidence:

- cold / warm実行時間
- hidden VS Code dependency
- 3 OS結果
- assertion / fixture coverageを維持できるか

暫定: `conditional`

### SG-004: Oxlint type-aware

現行v1では候補外。

- TypeScript version条件
- 追加dependency
- migration cost

があるため、TypeScript migration後または具体的な見逃しEvidenceが出た時に再評価する。

暫定: `blocked`

### SG-005: Repository-specific Skill

候補:

- Skillを作らずguide / task templateだけ改善
- read-only foundation audit Skillを1つ作る
- foundation audit、test strategy、technical researchを分ける
- inspired-mino suite全体を導入する

suite全体導入はproject規模とmaintenance costに対して過剰なため候補から外す。

判断材料:

- 同種taskの反復回数
- AGENTSだけでは再現できない判断手順
- Skill maintenance cost
- prompt / guideで同等成果物を作れるか

暫定: `conditional`

## 8. Current contradictions and gaps

| ID | Observation | Gap |
|---|---|---|
| C-001 | `test:all`という名前 | Electron、package、Vitestを含まない |
| C-002 | workflow EvidenceがCheck / Test / Playwrightへ分散 | local script名や初見の監査でPR gateを誤認しやすい |
| C-003 | workflowはPRで起動する | branch protection上でrequiredかは未確認 |
| C-004 | Electronをactual Webview正本とする | case別移行表と削除条件がない |
| C-005 | Oxlint configにscripts overrideがある | root lint scriptはscriptsを含まない |
| C-006 | Oxlintに旧Webview app overrideがある | current app構成と一致しない |
| C-007 | Vitest dependency / configがある | formal scriptと役割がない |
| C-008 | individual specsは詳細 | cross-capability対象一覧が同期していない |
| C-009 | Electron specはuser journey | visual、package、内部module smokeも同居する |
| C-010 | LefthookはMarkdown等をformat | CI formatは同じ集合をcheckしない |

## 9. Recommended sequence

### Phase 1: baseline completion

作成済み:

- capability catalog
- spec / test trace
- test runtime inventory
- CI Evidence map
- tooling file coverage

残り:

- repository treeによる全test fileの完全列挙
- branch protection / rulesetのrequired status確認
- Browser / Electron case単位の重複表
- maintainerによるrequired platformとquality priority承認

### Phase 2: decisions

一つの巨大ADRではなく、必要な判断だけを分ける。

- required test Evidence policy
- test directory semantics
- Browser Playwright残存範囲
- Electron required範囲
- packaging smoke責務
- tooling file coverage policy
- project Skill routing

### Phase 3: reversible experiments

- Node testの代表移行
- stale Oxlint overrideと未lint fileのdry-run
- Browser specのcontract単位分割
- Electron specのjourney / visual / package分割
- script名と実行内容の同期

### Phase 4: production refactoring reevaluation

baselineとEvidence policyが決まった後に、class、factory object、operation boundary、production directoryを再評価する。

## 10. Readiness

### Subject verdict

`conditional`

### Completed in this audit

- problemとcandidate meansを分離した
- initial CI audit errorを訂正した
- capability catalogを作成した
- spec / test traceを作成した
- representative testをruntime / oracleで分類した
- CI workflowをEvidence classで整理した
- tooling file coverageのdriftを記録した
- runner全面置換を即決しないSelection Gateを作成した

### Remaining obligations

- test treeの完全inventory
- branch protectionの確認
- Browser / Electronのcase単位比較
- required platformとquality priorityの人間承認
- ADRへ移す判断の選択

これらが完了するまで、test runnerの全面置換やproduction architectureの大規模変更を開始しない。
