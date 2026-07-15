# ADR-0015: runtime stagingからOS別VSIXを生成する

## ステータス

採用

## 日付

2026-07-15

## 背景

このprojectはpnpmで依存を管理しているが、`vsce package`のproduction dependency検証はpnpmの依存treeと互換しない場合がある。依存検証を無効にした`--no-dependencies`は、runtime dependencyをVSIXへ同梱しないため実行可能な配布物にならない。

さらに`sharp`はOS / architectureごとのnative packageをinstall環境に応じて選ぶ。1つのOSで作った`node_modules`を別OSへ持ち回ると、native binaryの互換性を保証できない。

## 決定

- releaseではLinux、macOS、WindowsのrunnerごとにVSIXを生成する
- 各runnerでbuild後、runtime manifestとcompiled output、Webview assets、extension metadataだけをOS一時directoryへstagingする
- staging内で`npm install --omit=dev --ignore-scripts`を実行し、production dependencyだけを同梱する
- staging内で`vsce package --target <platform>-<architecture>`を実行する
- stagingへのruntime fileのコピーはallowlistで管理し、docs、test、source、AI開発設定を配布物へコピーしない
- `--no-dependencies`はrelease生成方法として使わない

生成手順の正本は`package.json`の`package:vsix`と`scripts/package-vsix.mjs`、OS別runnerの正本は`.github/workflows/release.yml`とする。

## 理由

- pnpmのworkspace上の依存treeをvsceへ直接渡さず、npmが検証できるproduction treeを作れる
- `sharp`のnative packageを実際にpackageするrunnerのOS / architectureへ合わせられる
- allowlistにより、repositoryのdocsやAI設定を誤って配布しにくい
- 生成後のVSIXにはruntime dependencyが含まれるため、networkなしのsmoke testへ進められる

## 代替案

### `vsce package --no-dependencies`を使う

生成は通るがruntime dependencyが欠落するため採用しない。

### Linuxで作った1つのVSIXを全OSへ配布する

`sharp`のnative binaryを別OSで実行できる保証がないため採用しない。

### pnpmの`deploy --prod`出力をそのままVSIXへ渡す

VSIXに必要なruntime fileだけを制御しにくく、今回の検証では依存を含む配布stagingとして成立しなかったため採用しない。

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
