# タスク: ADR-0011からPR・commit templateを分離する

## Status

Done

## 目的

ADR-0011を成果物ごとの言語方針へ絞り、PR bodyとConventional Commitの具体的なtemplate・type一覧を実際の正本へ移す。

## 完了条件

- ADR-0011に成果物ごとの言語と判断理由が残っている
- PR templateの内容をADRへ重複させていない
- commit形式・type・例の詳細をADRへ重複させていない
- `.github/PULL_REQUEST_TEMPLATE.md`とRuleSync ruleへlinkしている
- ADR-0002との関係を維持している
- PR template、RuleSync、application、test、CIを変更していない

## 変更可能なファイル

- `docs/adr/0011-define-language-policy-for-project-artifacts.md`
- `docs/tasks/0167-separate-templates-from-language-adr.md`
- `docs/tasks/README.md`

## 対象外

- 成果物の言語方針変更
- PR templateとcommit ruleの内容変更
- RuleSync生成物の変更

## 関連

- [ADRの運用方針](../adr/README.md)
- [ADR-0002: 日本語を作業ドキュメントの正本にする](../adr/0002-use-japanese-as-source-for-docs.md)

## 確認方法

- ADR-0011から各成果物の言語判断を確認できることを確認する
- templateとcommit ruleの正本が1か所ずつであることを確認する
- `git diff --check`

## 実施結果

- ADR-0011に成果物ごとの言語、判断理由、代替案、結果、見直し条件を残した
- PR bodyの具体的な見出しと記載例を削除し、`.github/PULL_REQUEST_TEMPLATE.md`へlinkした
- commit形式、type一覧、例、breaking changeなどの運用詳細をADRから削除し、現在の有効な基本ruleを持つ`.rulesync/rules/overview.md`へlinkした
- ADRだけに存在した細則は新しい有効ruleへ昇格させず、ADRの対象外となる運用詳細として削除した
- ADR-0002を維持し、READMEの正本と翻訳方針はADR-0002に従う関係を明記した
- PR template、RuleSync、application、test、CIは変更していない
