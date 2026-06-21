# タスク: workspace境界の失敗テストを追加する

## Status

Done

## 目的

workspace外のファイル操作を拒否する仕様について、実装変更前に失敗テストを追加する。

## テスト方針

Test target:

- workspace内の既存ファイルを読み取り対象として許可する
- workspace内の未作成パスを書き込み対象として許可する
- `..` または絶対パスでworkspace外へ出る読み書きを拒否する
- workspace内のsymlinkを経由してworkspace外へ出る読み書きを拒否する
- workspace自体がsymlinkの場合、その実体内部を許可する
- `cropPdf.auto` がworkspace外入力、workspace外出力、外部を指すsymlinkを処理開始前に拒否する

Mocked:

- crop処理テストではGhostscript実行をmockする

Not tested:

- OS自体のアクセス制御
- ファイル検証後に別プロセスがsymlinkを差し替える競合の完全防止
- `execPath` の実行可否
- safe mode
- `WorkspaceEdit`

## 完了条件

- `test/workspace_path.test.ts` を追加している
- `test/crop_pdf_auto.test.ts` にworkspace境界の振る舞いを追加している
- `src/` を変更していない
- 新しいテストが未実装のため失敗することを確認している

## 変更可能なファイル

- `test/workspace_path.test.ts`
- `test/crop_pdf_auto.test.ts`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0012-add-workspace-boundary-tests.md`

## 対象外

- workspace境界検証の実装
- 既存実装の変更
- dependency追加

## 関連

- `docs/test-policy.md`
- `docs/test-matrix.md`
- `docs/specs/file-operation-security.md`
- `docs/tasks/0009-restrict-file-operations-to-workspace.md`

## 確認方法

- `pnpm run check:test` または `pnpm run test` が未実装を理由に失敗することを確認する

## 実行結果

実行日: 2026-06-21

- `test/workspace_path.test.ts` を追加した
- `test/crop_pdf_auto.test.ts` に入力・出力境界のテストを追加した
- `src/` は変更していない
- `pnpm run check:test` は `src/security/workspace_path.ts` が未実装であるため失敗した
