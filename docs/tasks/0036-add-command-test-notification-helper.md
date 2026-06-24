# タスク: VS Code command testの通知待ち対策helperを追加する

## Status

Done

## 目的

VS Code command testで`showInformationMessage`や`showErrorMessage`の通知待ちによってテストが停止しないように、共通helperとテスト方針を追加する。

## 背景

VS Code commandは成功通知やエラー通知の戻り値を`await`することがある。

テストで`vscode.commands.executeCommand(...)`を直接`await`すると、通知のボタン選択待ちでテストが止まる場合がある。

## 方針

- 通知を出す可能性があるcommand testでは、command実行Promiseを先に保持する
- 期待する副作用または短い待機後に`notifications.clearAll`を実行する
- 最後にcommand実行Promiseを`await`する
- このパターンを共通helperにまとめる

## 完了条件

- VS Code command test用の通知待ち対策helperが追加されている
- 既存のcommand実行テストがhelperを使っている
- `docs/test-policy.md`に通知を出すcommand testの書き方が記録されている
- `pnpm run check:test`が成功する
- `pnpm run test`が成功する

## 変更可能なファイル

- `test/`配下のhelperと関連test file
- `docs/test-policy.md`
- `docs/tasks/README.md`
- `docs/tasks/0036-add-command-test-notification-helper.md`

## 対象外

- application実装の変更
- VS Code commandの通知仕様変更
- lint ruleの追加
- dependency追加

## 関連

- `test/extension.test.ts`
- `test/convert_to_pdf_command.test.ts`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
- `git diff --check`
