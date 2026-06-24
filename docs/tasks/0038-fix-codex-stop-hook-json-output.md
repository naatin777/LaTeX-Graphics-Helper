# タスク: Codex Stop hookのJSON出力エラーを修正する

## Status

Done

## 目的

CodexのStop hookで`check:fix`を実行したときに、通常ログがstdoutへ出てCodexのJSON解析を壊さないようにする。

## 完了条件

- Stop hookのstdoutにはCodex向けのJSONだけを出す
- `check:fix`の通常ログはファイルへ保存する
- hookがgit root基準で動作する
- hookログ用の`.latex-graphics-helper/`をGit管理対象外にする

## 変更可能なファイル

- `.rulesync/hooks/stop-fix.sh`
- `.gitignore`
- `docs/tasks/README.md`
- `docs/tasks/0038-fix-codex-stop-hook-json-output.md`
- `docs/adr/0001-use-agents-md-for-codex-rules.md`

## 対象外

- `check:fix`の中身の変更
- RuleSyncのtarget追加
- 既存のlint warning修正

## 関連

- `docs/adr/0001-use-agents-md-for-codex-rules.md`
- `docs/tasks/0037-add-rulesync-stop-fix-hook.md`

## 確認方法

- `.rulesync/hooks/stop-fix.sh`
- `git diff --check`
