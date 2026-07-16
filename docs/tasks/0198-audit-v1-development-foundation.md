# タスク: v1開発基盤の前提を監査する

## Status

Done

## 目的

v1の追加リファクタリングへ進む前に、仕様の正本、テストEvidence、test directory、CI、Playwright / VS Code Electron、Oxlint、project Skillの役割を再確認し、現在の不整合と未決事項を明示する。

技術やdirectory構成を先に選ばず、利用者へ保証したい価値と品質scenarioから判断できるbaselineを作る。

## 変更内容

- 現在のcapability、spec、test、runner、CI、toolingの対応関係を監査する。
- 観測、解釈、仮説、unknown、contradictionを分離する。
- Playwright Browser、Playwright Electron、VS Code Extension Host、Vitest / Node testの候補責務を比較する。
- Oxlint設定の対象範囲、古い構成名、未lint file、type-aware lintingの適用条件を確認する。
- repository固有Skillの必要性と最小構成を検討する。
- 採用判断が必要な項目をSelection Gateとして残す。
- 後続taskの順序と完了条件を提案する。

## 対象外

- production codeのリファクタリング
- test fileやdirectoryの移動
- Browser Playwrightの削除
- Playwright Electronへの全面移行
- Oxlint ruleやdependencyの変更
- CI workflowやpackage scriptの変更
- 新しいSkillの実装
- 仕様をAI判断だけで確定すること

安全性blockerが見つかった場合は、監査結果へ記録し、別taskとして扱う。

## 確認方法

- `next/v1`のpackage scripts、CI、test config、test file、spec、ADR、AGENTSを照合する。
- Playwright Electron、VS Code extension testing、Oxlintの現行公式資料を確認する。
- capabilityからEvidenceまで追跡できない項目を列挙する。
- 現在の文書と実装で矛盾する記述を列挙する。
- 各候補手段について、採用条件、反証条件、必要Evidence、判断ownerを記録する。
- 初期調査と異なるEvidenceを発見した場合は、既存記録とPR説明を訂正する。

## 結果

### 作成済みbaseline

- `docs/foundation/v1-development-foundation-audit.md`
- `docs/foundation/capability-catalog.md`
- `docs/foundation/spec-test-trace.md`
- `docs/foundation/test-runtime-inventory.md`
- `docs/foundation/ci-evidence-map.md`
- `docs/foundation/tooling-file-coverage.md`
- `docs/research/v1-test-tooling-2026-07.md`

### 確認済みの主要事項

- `test:all`はVS Code testとBrowser Playwrightだけで、Electron、packaging、Vitestを含まない。
- PRでは`check.yml`だけでなく、`test.yml`が3 OSのVS Code testとLinux Electronを実行し、`playwright.yml`が3 OSのBrowser testを実行する。
- 初稿の「通常PRにはruntime testがない」という判断は誤りだったため訂正した。
- Nodeだけで証明できる可能性が高いpure / filesystem safety testが複数ある。
- Browser PlaywrightにはPDF.js / canvas固有の価値がある一方、Host simulationがElectronと重複する。
- Electron specにはcritical journey、visual、packaging smoke、package内部module検査が混在する。
- Safe Mode、Undo、cancellationの一部spec対象一覧がgeneric output conversion command群と同期していない。
- Oxlint configとroot lint対象、OxfmtとLefthook / CI、TypeScript configとactual layoutにdriftがある。
- Vitestはdependencyとconfigがあるがformal root scriptと確定した役割がない。

### 未決事項

- v1でrequiredとするplatformとEvidenceの種類
- Browser Playwrightをrenderer contractへ限定して残すか
- Linux Electronを全non-doc PRでrequiredにするか
- Node test migration experimentを採用するか
- test directoryをruntime別にするかsource co-locationにするか
- packaged smokeをtag前に実行する導線が必要か
- tooling対象fileをどこまでCIでenforceするか
- repository固有Skillを作るかguideだけにするか

### Remaining obligations

- branch protection / ruleset上のrequired statusを確認する
- maintainerがrequired platformとquality priorityを承認する
- 採用判断を個別ADRまたはtest policyへ移す

repository treeのtest file完全列挙とBrowser / Electronのtest case単位重複表は、0199で完了した。残る項目は監査未完了ではなく、maintainerのSelection Gateまたは後続taskとして扱う。

production code、test、CI、dependencyはこのtaskでは変更していない。
