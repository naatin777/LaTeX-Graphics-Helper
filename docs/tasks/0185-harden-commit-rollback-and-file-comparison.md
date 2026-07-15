# commit/rollbackと大容量比較を安全にする

## Status

Done

## Change Contract

### Problem

commit中のcopy失敗、overwrite対象の復元、rollback失敗の可視化、および大きな出力の全内容比較について、データ保護の証拠を再構築する。

### Allowed behaviors

- B-001: overwrite対象はcommit開始前のbackupから復元できる。
- B-002: 新規出力の不完全な自作ファイルは失敗時に残さない。
- B-003: 現在処理中・既に成功した出力を含めてrollbackする。
- B-004: rollback失敗は元エラーとともに確認可能で、対象pathをOutput Channelへ記録する。
- B-005: cancellation後のcommit済み出力もrollbackする。
- B-006: commit直前に外部変更された出力を上書きしない。
- B-007: 内容比較は大きなファイルを同時にreadFileせずstreaming hashを使う。

### Unresolved

- rollback失敗時の最終ユーザー通知文言は、既存の通知境界を確認して次taskへ引き継ぐ。

### Affected boundaries

commit、backup、rollback、cancellation、Output Channel、large-file comparison。

### Allowed files

- `src/operations/commit_conversion_outputs.ts`
- `src/operations/undo_last_conversion.ts`
- `src/operations/file_content_hash.ts`
- `test/commit_conversion_outputs.test.ts`
- `test/undo_last_conversion.test.ts`
- `test/file_content_hash.test.ts`
- `docs/tasks/0000-template.md`
- `docs/tasks/0186-0195-*.md`
- `docs/specs/undo-last-conversion.md`
- `docs/specs/file-operation-security.md`
- `docs/tasks/0185-harden-commit-rollback-and-file-comparison.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification               | Evidence type                     |
| -------- | --------------------------------- | --------------------------------- |
| B-001    | overwrite copy failure test       | integration-style filesystem test |
| B-002    | new output copy failure test      | integration-style filesystem test |
| B-003    | multi-output rollback test        | integration-style filesystem test |
| B-004    | injected rollback failure test    | observable error and log test     |
| B-005    | cancellation rollback test        | operation test                    |
| B-006    | pre-commit modification test      | filesystem race guard test        |
| B-007    | hash helper test and source audit | unit test / static evidence       |

### Dependencies

- Blocked by: none
- Blocks: 0186, 0187
- Can run in parallel with: none; this is the first safety boundary

### Not changing

- 起動時staging全体cleanupのsession設計
- Clipboard PasteのUI・lifecycle
- 新しいdependency、filesystem abstraction、汎用transaction framework

## Completion criteria

- 契約の全挙動に実測テストがある。
- rollback失敗のpath・元エラー・rollbackエラーが失われない。
- `readFile`による大容量内容比較を除去または明確な小ファイル限定にする。
- taskのVerification resultsを実測値で埋める。

## Verification results

| Command                | Result | Notes                                                                                     |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `pnpm run check:all`   | PASS   | lint, format, runtime/test/Webview typecheck completed; pre-existing lint warnings remain |
| `pnpm run test:vscode` | PASS   | 199 tests passed, including commit/rollback and streaming hash cases                      |
| `git diff --check`     | PASS   | no whitespace errors                                                                      |
