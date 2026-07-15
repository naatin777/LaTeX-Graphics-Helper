# session-safeなstaging lifecycleを実装する

## Status

Todo

## Change Contract

### Problem

起動時にworkspace直下のruntime root全体を再帰削除すると、別window・別extension host・Undo backup・未知の診断ファイルを壊し得る。

### Allowed behaviors

- B-001: 起動時cleanupはactiveな別session、未知directory、harness log、symlink先を削除しない。
- B-002: v1で安全なownershipを証明できない場合、起動時全体cleanupを撤回する。
- B-003: success/failure/cancellation/Undoのoperation単位cleanupは維持する。
- B-004: cleanup失敗は成功済み出力を失敗扱いにしないが、Output Channelへ記録する。

### Unresolved

- session marker方式を採用するか、起動時cleanupを完全撤回するかは0185後の実装証拠で決める。

### Affected boundaries

workspace staging、Undo backup、複数window、symlink、cleanup失敗。

### Allowed files

- `src/operations/cleanup_conversion_artifacts.ts`
- `src/extension.ts`
- `src/operations/*.ts`
- `test/cleanup_conversion_artifacts.test.ts`
- `test/undo_last_conversion.test.ts`
- `docs/specs/file-operation-security.md`
- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/tasks/0186-define-session-safe-staging-lifecycle.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification                     | Evidence type                     |
| -------- | --------------------------------------- | --------------------------------- |
| B-001    | active/unknown/symlink/harness fixtures | filesystem safety test            |
| B-002    | startup cleanup audit                   | source and behavior test          |
| B-003    | operation lifecycle tests               | integration-style filesystem test |
| B-004    | cleanup failure test                    | observable output/log test        |

### Dependencies

- Blocked by: 0185
- Blocks: 0187
- Can run in parallel with: none

### Not changing

- commit rollback contract
- Clipboard UI and cancellation propagation
- persistent lock manager or database

## Completion criteria

- 現在使用中のartifactをstartup cleanupが削除しない根拠がある。
- operation単位cleanupの全経路をテストする。
- taskのVerification resultsを実測値で埋める。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
