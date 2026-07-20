# npm移行で失われた依存install security policyを復元する

## Status

Done

pnpm→npm移行(PR #367)で失われたinstall時のsecurity policyを、npmの公式機能で復元した。package managerはnpmのまま変更しない。

## 目的

各pnpm設定が何を防いでいたかを整理し、採用npm(`npm@12.0.1`)の公式機能で実現できる範囲だけを最小限復元する。pnpmへは戻さない。

## pnpm設定との対応

| pnpm setting                 | 守っていたもの            | npmでの候補                             | 代替     | 採用判断                                                  |
| ---------------------------- | ------------------------- | --------------------------------------- | -------- | --------------------------------------------------------- |
| `allowBuilds`                | install scriptの許可制    | `allowScripts` + `strict-allow-scripts` | 部分代替 | 採用。現treeを再列挙しlefthookのみapprove、他3つはdeny。  |
| `minimumReleaseAge: 1440`    | 公開直後versionの回避     | `min-release-age=1`(単位day)            | 部分代替 | 採用。`npm ci`は再解決しないため`npm install`時のみ有効。 |
| `engineStrict`               | engine非互換のinstall拒否 | `engine-strict=true`                    | 完全代替 | 採用。                                                    |
| `packageManagerStrict`       | package manager固定       | `packageManager` + `devEngines`         | 部分代替 | 採用。CIで`npm@12.0.1`を明示install。                     |
| `strictPeerDependencies`     | peer衝突をerror           | `strict-peer-deps=true`                 | 完全代替 | 採用。                                                    |
| `verifyDepsBeforeRun: false` | run前のdeps検証(無効化)   | 同等機能なし                            | 代替なし | 記録のみ。npmに同等挙動なし。                             |
| frozen lockfile              | 再現可能install           | `npm ci` + `package-lock.json`          | 完全代替 | 移行時から維持済み。                                      |
| `autoInstallPeers`           | peer自動install           | npm既定で有効                           | 完全代替 | 追加設定不要。                                            |
| `nodeLinker: hoisted`        | flat node_modules         | npm既定                                 | 完全代替 | 追加設定不要。                                            |

## install script承認基準

`npm ci`後の`npm install-scripts ls`で列挙。install scriptを持つのは4package(すべてbuild/package/testで実行不要と実測)。`sharp`はprebuilt(`@img/sharp-*`)でscriptなし、承認対象外。

- `lefthook: true` — direct devDep。local git hook installのみ。`resolved` URL欠落でpin不可のためname承認。
- `puppeteer@25.3.0: false` — mermaid-cli経由。Chromium download。system Chrome利用のため不要。pinしてdeny。
- `keytar: false` — vsce経由optional。native binding build。packaging不要。
- `@vscode/vsce-sign: false` — vsce経由。VSIX署名。`vsce package`は署名なしで動作。

`strict-allow-scripts=true`で、4package中いずれかがレビューから外れる/approved versionが変わると`npm ci`がexit 1で失敗する。CIは既存`npm ci`がそのままgate。

## audit policy

`npm audit --audit-level=high`: `@vscode/test-cli`→`mocha`→`serialize-javascript`にhigh 1・moderate 2。すべてdev-only(VSIX非同梱)・fix未提供。policy復元とvulnerability更新を分離し、CI gateへは追加しない。`audit fix --force`・advisory ignore・audit無効化は使わない。

## 変更ファイル

- `.npmrc`(新規)
- `package.json`(`packageManager`, `devEngines`, `allowScripts`)
- `.github/workflows/{check,test,playwright,release}.yml`(npm@12.0.1 pin + version echo)
- `docs/specs/internal/packaging.md`(dependency security policy節)

## Verification results

| Command                                         | Result | Notes                                                           |
| ----------------------------------------------- | ------ | --------------------------------------------------------------- |
| `rm -rf node_modules && npm ci`                 | Pass   | 4 install scriptすべてレビュー済みでwarning/errorなし、exit 0。 |
| `npm install-scripts ls`                        | Pass   | "No packages with unreviewed install scripts." exit 0。         |
| 未レビューpackageでの`npm ci`(検証用、非commit) | Pass   | lefthookをallowScriptsから外すと`ESTRICTALLOWSCRIPTS`でexit 1。 |
| `npm run check:all`                             | Pass   | lint/format/typecheck/NLS(283 keys)。                           |
| `npm run build`                                 | Pass   | extension + 3 webview build。                                   |
| `npm test`                                      | Pass   | 239 passing。                                                   |
| `npm run package:vsix -- --out /tmp/...vsix`    | Pass   | 102 MB VSIX、install scriptすべてblockでも成功。                |
| packaged VSIX Electron smoke                    | Pass   | 1 test passed。Sharp native PNG→JPEG成功。                      |
| `npm audit --audit-level=high`                  | 記録   | dev-only high 1 + moderate 2、fixなし。gate追加せず。           |

darwin-arm64 localで確認。Linux/macOS/WindowsはCI(check/test/playwright)で確認する。

## 残risk

- dev-only `serialize-javascript` high(vsce-test-cli chain、fixなし)。別taskで対応。
- `keytar`/`lefthook`/`@vscode/vsce-sign`はlockfileに`resolved` URLがなくversion pin不可(name承認/deny)。lockfile完全化は broad update回避のため今回見送り。

## 追加で必要なtask

- 0203(候補): dev test tooling(`@vscode/test-cli`/`mocha`)のserialize-javascript vulnerability更新。breaking可能性の評価を含む。
