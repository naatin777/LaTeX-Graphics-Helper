# タスク: Stop hookのdirty worktree安全テストを追加する

## Status

Todo

## 目的

Stop hookがユーザーや別作業の未コミット差分を自動修正せず、stdoutのJSON制約と失敗時の変更保持を維持することを、実装変更前の失敗テストで定義する。

## 完了条件

- clean worktreeでは`pnpm run check:fix`を1回実行するテストがある
- task対象fileだけがdirtyでも`check:fix`を実行せず、file内容を変更しないテストがある
- staged、unstaged、未追跡fileを含むdirty状態で自動修正をskipするテストがある
- 空白やUnicodeを含む未追跡pathでもdirtyと判定するテストがある
- dirtyによるskipはstdoutへ`{}`だけを出してexit 0になり、警告がstderrまたはlogへ分離されるテストがある
- clean状態で開始した`check:fix`が途中で変更して失敗しても、自動復元せず、stdout JSONを維持してexit 1になるテストがある
- Git rootを確認できない場合に`pnpm`を実行せず、安全にskipするテストがある
- temporary Git repositoryとfake `pnpm`を使い、実際のrepositoryへ`check:fix`を実行しない
- test fileだけを変更し、`.rulesync/hooks/stop-fix.sh`を変更していない

## 変更可能なファイル

- Stop hookの振る舞いを検証する新しい`test/**/*.test.ts`
- `docs/tasks/0169-add-safe-stop-hook-worktree-tests.md`
- `docs/tasks/README.md`

## 対象外

- `.rulesync/hooks/stop-fix.sh`の変更
- RuleSync生成物の変更
- `check:fix`、lint、format commandの変更
- task skillとworktree運用の実装
- application、CI、dependencyの変更

## 関連

- [0164: Stop hookのdirty worktree方針を決める](0164-design-safe-stop-fix-hook.md)
- [0038: Codex Stop hookのJSON出力エラーを修正する](0038-fix-codex-stop-hook-json-output.md)
- [ADR-0014: AI開発ハーネスの責務を分離する](../adr/0014-define-ai-development-harness.md)

## 確認方法

- 追加したStop hook testを実行する
- `pnpm run check`
- `git diff --check`
