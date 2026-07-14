# タスク: ADR-0001からStop hookの運用詳細を分離する

## Status

Todo

## 目的

ADR-0001を「AI向けruleはRuleSyncを正本にする」という永続判断へ絞り、Stop hookのcommand、log、stdout制約など変更されやすい実装詳細を正本へ移す。

## 完了条件

- ADR-0001にRuleSyncを正本とする判断、理由、結果が残っている
- Stop hookの具体的なcommandと出力仕様をADRへ重複させていない
- hook詳細の正本へlinkしている
- ADR-0001の採用判断自体を変更していない
- RuleSync、hook、application、test、CIを変更していない

## 変更可能なファイル

- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `docs/tasks/0166-separate-stop-hook-details-from-adr-0001.md`
- `docs/tasks/README.md`

## 対象外

- `.rulesync/`とRuleSync生成物の変更
- Stop hookの安全方針・実装変更
- ADR-0001を置き換える新しい設計判断

## 関連

- [ADRの運用方針](../adr/README.md)
- [0164: Stop hookのdirty worktree方針を決める](0164-design-safe-stop-fix-hook.md)

## 確認方法

- ADR-0001と`.rulesync/`で同じ実装詳細を重複管理していないことを確認する
- `git diff --check`
