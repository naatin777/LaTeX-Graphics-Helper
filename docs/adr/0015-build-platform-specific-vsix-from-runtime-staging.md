# ADR-0015: npmからOS別VSIXを生成する

## ステータス

採用

## 日付

2026-07-15

## 背景

`vsce package`はnpmのproduction dependency treeを前提にしている。pnpmは単一拡張のpackage管理に不要なworkspaceと独自node_modules treeを持ち、VSCEの依存検証とも互換しないため採用しない。

さらに`sharp`はOS / architectureごとのnative packageをinstall環境に応じて選ぶ。1つのOSで作った`node_modules`を別OSへ持ち回ると、native binaryの互換性を保証できない。

## 決定

- releaseではLinux、macOS、WindowsのrunnerごとにVSIXを生成する
- 各runnerで`npm ci`とbuildを実行し、runner固有のnative dependencyをinstallする
- repository rootで`npx --no-install vsce package --target <platform>-<architecture>`を実行する
- `.vscodeignore`でdocs、test、source、AI開発設定、source mapなどを配布物から除外する
- `package-lock.json`だけを依存lockfileとして使い、VSIX専用lockfileや独自lockfile同期処理は追加しない

生成手順の正本は`package.json`の`package:vsix`と`scripts/package-vsix.mjs`、OS別runnerの正本は`.github/workflows/release.yml`とする。VSIX専用stagingは通常のroot packageでproduction dependencyが正常に同梱できない場合だけ再検討する。

## 理由

- npm公式toolchainに近い`npm ci`、`npm run build`、`npx vsce package`の流れで検証できる
- `sharp`のnative packageを実際にpackageするrunnerのOS / architectureへ合わせられる
- `.vscodeignore`により、repositoryのdocsやAI設定を誤って配布しにくい
- 生成後のVSIXにはruntime dependencyが含まれるため、networkなしのsmoke testへ進められる

## 代替案

### `vsce package --no-dependencies`を使う

依存収集自体を無効にするためruntime dependencyが欠落し、採用しない。

### Linuxで作った1つのVSIXを全OSへ配布する

`sharp`のnative binaryを別OSで実行できる保証がないため採用しない。

### pnpmをpackage managerとして使う

VSCEはpnpmの依存treeを正式にサポートしていないため、package managerをnpmへ統一する。

## 結果・影響

- release jobはOSごとのpackage jobと、artifactを公開するpublish jobに分かれる
- releaseごとに3個のplatform-specific VSIXを生成する
- production dependencyのinstallとpackageがOSごとに行われるため、release時間とnetwork使用量が増える
- `sharp`以外のnative dependencyが追加された場合も、同じplatform-specific package方針を適用する
- 実際のVSIXをnetwork遮断下で動かすことは別taskで確認する

## 見直す条件

- `vsce`がpnpmの依存treeを正式に検証できるようになった場合
- runtime dependencyを含むuniversal VSIXを各OSで安全に実行できる方法が確認できた場合
- `sharp`を含むnative dependencyを別方式へ変更した場合
- platform-specific VSIXのrelease運用がMarketplaceまたはOpen VSXの制約に合わない場合

## 関連

- [VSIXオフライン・3 OS調査](../research/2026-07-15-offline-vsix-cross-platform.md)
- [0179: VSIXのproduction dependency同梱とplatform packageを成立させる](../tasks/0179-fix-vsix-production-dependency-packaging.md)
- [0180: パッケージ済みVSIXのオフライン3 OS smoke testを追加する](../tasks/0180-add-packaged-vsix-offline-smoke-tests.md)
