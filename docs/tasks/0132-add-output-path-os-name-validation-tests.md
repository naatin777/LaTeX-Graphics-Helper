# タスク: outputPathのOS禁止名失敗テストを追加する

## Status

Done

## 目的

実行先OSで無効な`outputPath`を変換開始前に拒否する仕様の失敗テストを追加する。

## Test Planning Phase

### テストする仕様

- Windowsの禁止文字・制御文字・予約名を拒否する
- Windowsの先頭末尾半角空白・末尾ピリオドを拒否する
- Windowsのdrive letterとseparatorを誤検出しない
- POSIXではWindows専用の禁止文字・予約名を拒否しない
- NULは共通で拒否する
- 多言語・絵文字・全角英数字・途中半角空白・全角空白を許可する
- 無効なcrop出力設定では進捗表示と作業ファイル作成を開始しない

### 変更するtest file

- `test/resolve_output_path.test.ts`
- `test/crop_pdf_output_path_validation.test.ts`
- `test/crop_pdf_configure_operation.test.ts`
- `test/helpers/crop_configure_fixture.ts`

### mockするもの

- `showQuickPick`
- `showErrorMessage`
- `withProgress`
- `createOutputChannel`

### テストしないもの

- 禁止名を実filesystemへ作成した場合のOS error文言
- path長上限
- network filesystem固有の制限
- production code

## 完了条件

- 追加テストが型チェックを通る
- 未実装のOS禁止名検証に対して、期待した理由で失敗する
- 既存の複雑なUnicode正常系をcross-platformで有効な名前へ修正する
- production codeを変更しない

## 変更可能なファイル

- `test/resolve_output_path.test.ts`
- `test/crop_pdf_output_path_validation.test.ts`
- `test/crop_pdf_configure_operation.test.ts`
- `test/helpers/crop_configure_fixture.ts`
- `test/fixtures/pdf-operations/user-files/README.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0132-add-output-path-os-name-validation-tests.md`

## 対象外

- production codeの変更
- validatorの実装
- エラー文言の多言語対応

## 関連

- [outputPath検証仕様](../specs/output-path-validation.md)
- [0131: outputPathのOS禁止名検証を設計する](0131-design-output-path-os-name-validation.md)

## 確認方法

- `pnpm run typecheck:test`
- 追加した失敗テストだけを実行し、未実装のため失敗することを確認する
