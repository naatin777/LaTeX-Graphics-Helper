# タスク: ファイル操作をworkspace内へ制限する

## Status

Done

## 目的

`execPath` の参照を除き、拡張機能によるファイルの読み書き対象がworkspace外の場合はエラーにする。

## 完了条件

- workspace内外を判定する共通処理がある
- 入力、作業領域、出力先についてworkspace外の操作を拒否する
- 文字列上workspace内でも、symlinkの実体がworkspace外なら拒否する
- 未作成の書き込み先は、最も近い既存親ディレクトリの実体を検証する
- workspace自体がsymlinkの場合、その実体内部を許可する
- 重要な書き込み直前に境界を再検証する
- `execPath` はworkspace外を許容する
- path traversalとsymlinkを考慮したテストがある

## 変更可能なファイル

- `src/security/workspace_path.ts`
- `src/operations/crop_pdf_auto.ts`
- `test/workspace_path.test.ts`
- `test/crop_pdf_auto.test.ts`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0009-restrict-file-operations-to-workspace.md`

## 対象外

- safe modeの上書き確認UI
- `WorkspaceEdit` 対応

## 関連

- `docs/adr/0006-use-workspace-staging-for-file-operations.md`
- `docs/specs/internal/file-operation-security.md`
- `docs/tasks/0012-add-workspace-boundary-tests.md`
- `docs/tasks/0008-implement-safe-auto-crop.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`

## 実施結果

- 既存ファイルの読み取りと未作成パスへの書き込みを、論理パスと実体パスの両方で検証する共通処理を追加した
- 入力PDF、workspace内の作業領域、変換結果の一時ファイル、最終出力先を検証対象にした
- workspace外、workspace名とprefixだけが一致するパス、workspace外を指すsymlinkを拒否する
- workspace自体がsymlinkの場合は、その実体ディレクトリ内の操作を許可する
- Ghostscriptの`execPath`はworkspace境界検証の対象にしていない
- 重要な書き込みとロールバックの直前に境界を再検証する
- `pnpm run check:all` 成功（既存を含むlint warningあり）
- `pnpm run test` 成功（22 tests）

## 残る制約

- ファイルシステムの検証から操作までの間を完全に原子的にはできないため、TOCTOUを完全には防止しない
- 出力反映をVS CodeのUndo対象にする処理は`0010`で行う
