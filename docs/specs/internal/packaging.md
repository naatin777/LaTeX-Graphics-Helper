# VSIX packaging仕様

## dependency source

VSIXはrepository rootで`npm ci`、`npm run build`、`npx --no-install vsce package --target <platform>-<architecture>`を実行して生成する。依存lockfileは通常の`package-lock.json`だけを使い、VSIX専用lockfileやstaging内の依存再解決は行わない。

production dependencyが正常に含まれることを`npm ls --omit=dev`と生成VSIXの内容で確認する。変更時は各OS runnerでnative packageと生成VSIXを再確認する。

rootの`package.json`をそのまま使い、`.vscodeignore`でruntimeに不要な開発ファイルを除外する。

## target

package scriptは現在runnerの`process.platform`と`process.arch`からtargetを求める。指定targetがcurrent runnerと異なる場合は失敗する。release matrixはrunnerが実際に提供するtargetを生成する。

未検証native dependencyを含むcross-compile targetを提供しない。

## CLI

packagingはrootの`npm`と`npx --no-install`を使う。Windowsを含む全platformでshell command stringを組み立てず、argument arrayと`shell: false`を使う。

Windowsを含む全platformでshell command stringを組み立てず、argument arrayと`shell: false`を使う。

## packaged smoke

各targetのVSIXは同じrunnerの実VS Code Electronへinstallし、Crop Configure、Crop / Merge / Split、PNG-to-JPEG raster conversion、外部CLI失敗経路を実行する。PNG-to-JPEGの成功はVSIX内のSharp native dependencyがloadできた証拠とする。

## version

VS Code integration testは固定versionを使う。互換性確認用のlatest stable testを追加する場合はrequired testと混同しない別jobにする。
