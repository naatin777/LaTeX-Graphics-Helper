# VSIX packaging仕様

## dependency source

VSIXのstagingはrepository rootで`pnpm --filter . deploy --prod --legacy <stage>`を実行する。`pnpm-lock.yaml`のresolved dependencyを使い、staging directoryでnpm installやsemver rangeの再解決を行わない。

`--legacy`は現在のpnpm 11 workspaceが`inject-workspace-packages`未設定であるため必要である。変更時はpnpmの実パッケージでdeploy結果を再確認する。

staging後にruntime manifestからdevDependencies、scripts、packageManager metadataを除外する。production `node_modules`にはruntime dependenciesだけを含める。

## target

package scriptは現在runnerの`process.platform`と`process.arch`からtargetを求める。指定targetがcurrent runnerと異なる場合は失敗する。release matrixはrunnerが実際に提供するtargetを生成する。

未検証native dependencyを含むcross-compile targetを提供しない。

## CLI

packagingはrootのlockfileから`pnpm`経由で起動され、`npm_execpath`が示すpnpm JavaScript CLIをNode executableから直接起動してdeployを行う。インストール済み`@vscode/vsce`はNode executableで直接起動する。publishはrootのlockfileから`pnpm exec vsce`と`pnpm exec ovsx`を使う。

Windowsを含む全platformでshell command stringを組み立てず、argument arrayと`shell: false`を使う。

## packaged smoke

各targetのVSIXは実VS Code Electronへinstallし、Crop ConfigureとPNG-to-JPEG raster conversionを実行する。後者の成功はVSIX内のSharp native dependencyがloadできた証拠とする。

## version

VS Code integration testは固定versionを使う。互換性確認用のlatest stable testを追加する場合はrequired testと混同しない別jobにする。
