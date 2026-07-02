# タスク: progressとnotification文言を多言語対応する

## Status

Done

## 目的

`progress.report`、`showInformationMessage`、`showWarningMessage`、`showErrorMessage` などのユーザー向け文言が英語ハードコードになっているため、多言語対応の方針を決めて実装する。

## 完了条件

- 実行時に表示されるユーザー向け文言の置き場を決める
- 少なくとも変換系・crop・splitのprogress / notification文言を多言語対応する
- 既存の `package.nls.json` / `package.nls.ja.json` で足りるか、別の仕組みが必要か判断する
- テストまたは型チェックで文言キーの欠落を検出できる状態にする

## 対象外

- コマンドID、設定キー、ログ向け内部メッセージの翻訳
- エラー原因として内部的に使う文字列の全面翻訳

## 関連

- `docs/adr/0011-define-language-policy-for-project-artifacts.md`

## 方針

- 実行時のユーザー向け文言は、既存の`package.nls.json` / `package.nls.ja.json`にキーを追加して管理する。
- 実装側は`src/commands/user_messages.ts`経由で文言を取得する。
- 新しい翻訳ファイル形式は追加しない。
- コマンドID、設定キー、内部エラー原因、ログ向けメッセージは対象外のままにする。
- 英語と日本語のNLSキーが一致していることをテストする。

## 実装内容

- 変換系、crop、splitのprogress / notification文言を`package.nls.json` / `package.nls.ja.json`に移した。
- Safe Modeの確認ダイアログと、直前変換取り消し通知も同じ仕組みに移した。
- `src/commands/user_messages.ts`でプレースホルダー付き文言を取得する。
- `package.nls.json`と`package.nls.ja.json`のキー一致をテストする。

## 確認結果

- `CI=true pnpm run check`
- `CI=true pnpm run check:test`
- `CI=true pnpm run test -- --grep "英語と日本語のNLSキーが一致している"`
  - buildとtest typecheckまでは成功
  - ローカルのVS Code test host起動が`SIGABRT`で失敗したため、実行確認はPRのGitHub Actionsで行う
