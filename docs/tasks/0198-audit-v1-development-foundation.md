# タスク: v1開発基盤の前提を監査する

## Status

In Progress

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

## 結果

監査中。成果物は `docs/foundation/v1-development-foundation-audit.md` と `docs/research/v1-test-tooling-2026-07.md` に記録する。
