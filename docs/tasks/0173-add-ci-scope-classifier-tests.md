# タスク: CI scope classifierの仕様テストを追加する

## Status

Done

## 目的

変更file一覧からCI scopeを決めるclassifierについて、実装前にdocs-only、Webview、conversion、unknown、複数scopeの判定仕様をテストで固定する。

## 完了条件

- classifierの入力と出力contractを決めている
- docs-onlyが重いtestを要求しないことをテストしている
- Webview変更がElectron E2Eを要求することをテストしている
- conversion / external CLI変更が3 OSのconversion testを要求することをテストしている
- package / lockfile / CI変更がfull scopeになることをテストしている
- unknown file、空の変更file list、diff取得失敗がfull scopeになることをテストしている
- 初期実装では複数の非docs scopeがfull scopeになることをテストしている
- docsと単一非docs scopeの組み合わせが、非docs側のscopeになることをテストしている
- PR、push、初回push、rename、削除、diff取得失敗の扱いをテストしている

## 変更可能なファイル

- classifier仕様テスト
- 必要なtest fixture
- `docs/tasks/0173-add-ci-scope-classifier-tests.md`
- `docs/tasks/README.md`

## 対象外

- classifier本体の実装
- workflow接続
- test分割

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- 追加したclassifier仕様テストを実行する
- `pnpm run check`
- `git diff --check`

## 入力contract

classifier本体は `.github/scripts/detect-ci-scope.mjs` から `classifyCiScope(input)` としてexportする。

- `input`は外部入力境界として`unknown`を受け取る
- 正常入力はGitHub eventとdiff結果を持つ
  - eventは`pull_request`、または`beforeSha`を持つ`push`
  - diff結果は変更file一覧を持つ`ok`、または`failed`
  - 変更fileは`path`、`status`、rename時の`previousPath`を持つ
- pathはrepository相対pathとして扱い、空白、Unicode、改行を1要素のまま保持する
- 空path、絶対path、親directoryへ抜けるpathはunknownとしてfull scopeへ倒す
- 初回pushは`beforeSha`がzero SHAであることで判定する
- malformed input、循環参照、property accessが失敗するobjectでもthrowしない
- 入力を安全に判定できない場合はfull scopeへ倒す

## 出力contract

`classifyCiScope`は次を返す。

- `scope`
  - `docs`
  - `ai-rules`
  - `extension-core`
  - `conversion`
  - `webview`
  - `full`
- `targets`
  - `check`の実行要否
  - `vscodeCore`の対象OS
  - `vscodeConversion`の対象OS
  - `browserPlaywright`の対象OS
  - `electronE2e`の対象OS
- 空ではない`reason`

現在のCI構成に合わせ、Webview scopeは移行期間中のBrowser Playwright 3 OSとLinux Electron E2Eを要求する。conversion scopeはVS Code core / conversionを3 OSで要求する。full scopeのElectron E2Eは、現状実行しているLinuxを対象とする。

## 実施結果

- docs-only、AI rule、Webview、conversion、external CLI、package、lockfile、CI、unknownの判定を仕様テストへ追加した
- PR、通常push、初回push、rename、削除、diff取得失敗を仕様テストへ追加した
- path prefixの誤一致、空・絶対・親directory path、空白・Unicode・改行pathを仕様テストへ追加した
- docsと単一非docs scope、複数非docs scopeの組み合わせを仕様テストへ追加した
- malformed input、循環参照、hostile getterをthrowせずfull scopeへ倒すcontractを追加した
- `pnpm run check`は成功した
- `pnpm run check:test`は成功した
- 追加テストはcompileに成功し、classifier本体が未実装のため`ERR_MODULE_NOT_FOUND`で想定どおり失敗した
- classifier本体、workflow、test分割は変更していない
