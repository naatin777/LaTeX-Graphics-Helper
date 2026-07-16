# ADR-0015: lockfile-based VSIX packaging

## Status

Accepted

## Context

staging directoryで`npm install --omit=dev`を行うと、package.jsonのsemver rangeからruntime dependencyを再解決する。Sharpのnative binaryや既存lockfileとの差がtag packagingで発生する可能性がある。

## Decision

root workspaceでpnpm deployのproduction modeを使い、pnpm lockfileに従ったnode_modulesをstagingへ作る。pnpm 11 workspaceの現行設定では`--legacy`を明示する。VSCEはrootにインストール済みのCLIを直接起動し、publishは`pnpm exec`を使う。

package targetはcurrent runnerのplatform/architectureだけを許可する。packaged smokeではSharpを実際にloadするraster conversionを実行する。

## Consequences

- stagingはnpm registryの新しいsemver解決に依存しない。
- targetごとにnative binaryの実runner検証が必要になる。
- deployのpnpm仕様が変わった場合は、package taskで実パッケージを再確認する。
- package scriptはcross-platform shell quoting差を受けにくくなる。
