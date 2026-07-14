# タスク: Stop hookへdirty worktree guardを実装する

## Status

Done

## 目的

0169で追加したテストを通す最小実装として、dirty worktreeやGit rootを確認できない環境では`check:fix`を実行しないguardをStop hookへ追加する。

## 完了条件

- staged、unstaged、未追跡fileを含むdirty worktreeでは`check:fix`を実行しない
- task対象fileだけがdirtyな場合も、所有権を判定せず安全側にskipする
- clean worktreeでは既存の`check:fix`を実行する
- Git rootまたはworktree状態を確認できない場合は`pnpm`を実行しない
- dirtyまたは判定不能によるskipは警告付きexit 0とする
- `check:fix`の失敗は変更を自動復元せず、logとstderrで知らせてexit 1とする
- 成功、skip、失敗のいずれもstdoutにはJSONだけを出す
- 0169で追加した期待値を都合よく変更していない

## 変更可能なファイル

- `.rulesync/hooks/stop-fix.sh`
- `docs/tasks/0170-implement-safe-stop-hook-worktree-guard.md`
- `docs/tasks/README.md`

## 対象外

- 0169で追加したテスト期待値の変更
- RuleSync ruleと生成物の変更
- `check:fix`、lint、format commandの変更
- task skillとworktree運用の実装
- application、CI、dependencyの変更

## 関連

- [0164: Stop hookのdirty worktree方針を決める](0164-design-safe-stop-fix-hook.md)
- [0169: Stop hookのdirty worktree安全テストを追加する](0169-add-safe-stop-hook-worktree-tests.md)
- [0038: Codex Stop hookのJSON出力エラーを修正する](0038-fix-codex-stop-hook-json-output.md)

## 確認方法

- 0169で追加したStop hook testを実行する
- `pnpm run check`
- `git diff --check`

## 確認結果

- Git rootを確認できない場合は`pwd`へfallbackせず、警告と`{}`を出してexit 0でskipするようにした
- staged、unstaged、未追跡fileを含むdirty状態をpath解析せずに判定し、task対象だけがdirtyでも`check:fix`を実行しないようにした
- clean時だけlog directoryを作成し、既存の`pnpm run check:fix`を実行する順序にした
- log directory作成または`check:fix`が失敗してもstdoutへJSONを出し、自動復元せずexit 1にした
- `pnpm exec mocha --ui tdd out/test/stop_fix_hook.test.js --reporter spec`: 5件成功
- `pnpm run test:vscode`: 174件成功。`.vscode-test.mjs`を使う標準runnerで確認した
- `pnpm run check:all` 成功
- `pnpm run rulesync:check` 成功
- 0169で追加したテスト、RuleSync生成物、`check:fix`、application、CI、dependencyは変更していない
