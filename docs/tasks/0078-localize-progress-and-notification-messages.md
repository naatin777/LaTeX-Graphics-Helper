# タスク: progressとnotification文言を多言語対応する

## Status

Todo

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
