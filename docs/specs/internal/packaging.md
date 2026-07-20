# VSIX packaging仕様

## dependency source

VSIXはrepository rootで`npm ci`、`npm run build`、ローカルVSCEのNode entrypointを`node node_modules/@vscode/vsce/vsce package --target <platform>-<architecture>`として実行して生成する。依存lockfileは通常の`package-lock.json`だけを使い、VSIX専用lockfileやstaging内の依存再解決は行わない。

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

## dependency security policy

pnpmからnpmへの移行(PR #367)で失われたinstall時のsecurity policyを、npmの公式機能で復元する。package managerはnpmのまま変更しない。

採用npm versionは`npm@12.0.1`。CIは各workflowで`actions/setup-node`の`node-version: 22.22.2`(npm@12.0.1が要求するNode下限)のあと、`npm install -g npm@12.0.1`を実行してから`npm ci`する。Node 22同梱のnpmは10系でinstall-script policyやmin-release-ageを持たないため、明示的に上書きする。localでは`devEngines.packageManager`を`12.0.1`に固定し`onFail: error`とする。これによりnpm 10など12.0.1以外では`npm ci`が`EBADDEVENGINES`で即時失敗し、policyを迂回できない。`packageManager`フィールドだけではnpm versionは切り替わらない。localでもnpm 12.0.1を使うには、corepack/手動でnpm 12.0.1を有効にするか、CIと同じく`npm install -g npm@12.0.1`で上書きする必要がある。`setup-node`の`cache: npm`はpackage-lock.jsonからcacheをrestoreする際にdevEnginesを評価するため、`onFail: error`ではnpm 12へupgradeする前にnpm 10のまま`EBADDEVENGINES`で落ちる。このためCIからは`cache: npm`を外し、npm 12 install後に`npm ci`でpolicyを適用する。

責務の分離:

- `devEngines.packageManager`(`onFail: error`): localでnpm versionを強制し、12.0.1以外のinstallを即時拒否する。
- `devEngines.runtime` / `engines.node`(`>=22.22.2`): 実行・installに必要な最小Node versionを強制する(`engine-strict=true`と組み合わせ)。
- CIの`setup-node` + `npm install -g npm@12.0.1`: CI環境でもnpm 12.0.1とNode 22.22.2以上を確実に用意する。CIの強制は`devEngines`ではなくこのpinで担保する。
- `.npmrc`: install-script policy(`strict-allow-scripts`)、engine厳格化(`engine-strict`)、peer厳格化、release age(`min-release-age`)を定義する。

`.npmrc`のpolicy:

- `engine-strict=true`: `engines`に非互換なpackageのinstallを拒否する(pnpm `engineStrict`相当)。
- `strict-peer-deps=true`: peer dependencyの衝突をerrorにする(pnpm `strictPeerDependencies`相当)。npmのpeer auto-installは既定で有効なため`autoInstallPeers`は別設定不要。
- `strict-allow-scripts=true`: `allowScripts`未レビューのinstall scriptを持つpackageで`npm ci`をexit code 1で失敗させる(pnpm `allowBuilds`のenforcement相当)。`ignore-scripts`と`dangerously-allow-all-scripts`は使わない。
- `min-release-age=1`: 公開後1日未満のversionをdependency解決から除外する(pnpm `minimumReleaseAge: 1440`分=1日相当。npmの単位はday)。`npm ci`はlockfileを再解決しないため、この値は`npm install`時のみ効く。

install scriptの承認は`package.json`の`allowScripts`で管理する。現在のdependency treeを`npm ci`後の`npm install-scripts ls`で列挙し、install scriptを持つpackageは`@vscode/vsce-sign`、`keytar`、`lefthook`、`puppeteer`の4つ(すべてbuild・package・testで実行不要と実測)。`sharp`はprebuilt binary(`@img/sharp-*` optionalDependencies)を使いinstall scriptを持たないため承認対象外。承認は次の基準とする。

- `lefthook: true` — direct devDependency。localのgit hook installのみ。build/package/testに影響しない。version付きapproval(`lefthook@2.1.10: true`)はnpm 12.0.1のlockfile identityと一致せず承認されないため、dependencyをexact pin(`lefthook: "2.1.10"`)してname承認とする。
- `puppeteer@25.3.0: false` — mermaid-cli経由のtransitive。postinstallはChromium download。extensionはpuppeteer-coreでsystem Chrome(channel)またはuser executablePathを使うためbundled Chromeは不要。versionをpinしてdeny。
- `keytar: false` — `@vscode/vsce`経由のtransitive・optional・dev。native credential storage bindingのbuild。packagingはmarketplace認証を使わないため不要。
- `@vscode/vsce-sign: false` — `@vscode/vsce`経由のtransitive。VSIX署名用postinstall。`vsce package`は署名なしで動作するため不要。

`strict-allow-scripts=true`により、上記4つのいずれかがレビュー(true/false)から外れると`npm ci`が`ESTRICTALLOWSCRIPTS`で失敗する。さらに`lefthook`はdependencyをexact pin(`lefthook: "2.1.10"`)しているため、versionを更新するには`package.json`と`package-lock.json`の両方を意図的に変更する必要があり、`npm ci`はlockfile不一致(`EUSAGE`)で失敗する。つまりversion変更は再レビューを伴う明示的な変更として検知される。puppeteer等はversion付きdeny(`puppeteer@25.3.0: false`)でpin外れ時に再レビューが必要になる。CIは既存の`npm ci`がそのままgateになるため、追加の検査commandは不要。

audit: `npm audit --audit-level=high`で、`@vscode/test-cli` → `mocha` → `serialize-javascript`のchainにhigh 1件・moderate 2件が存在する。すべてdev-only(VSIX非同梱)でfix未提供。security policy復元とvulnerability更新は分離し、auditはCI gateへ追加しない。`--audit-level`の無効化やadvisory ignore、`audit fix --force`は使わない。
