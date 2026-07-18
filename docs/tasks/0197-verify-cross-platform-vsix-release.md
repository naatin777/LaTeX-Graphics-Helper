# CI・Playwright・VSIX releaseを4 workflowへ整理する

## Status

In Progress

## 目的

GitHub Actionsを次の4 workflowへ整理し、Electron Playwrightの対象を、必ず直前にpackage・installしたVSIXだけに統一する。

- `check.yml`: lint、format、production/test/Webview/Webview testのtypecheck
- `test.yml`: build、VS Code Extension Host test、JSDOM Webview component testをLinux、macOS、Windowsで実行
- `playwright.yml`: build、runner一致VSIXのpackage・install、installed VSIXのElectron Playwrightを3 OSで実行
- `release.yml`: tag pushで同じ3 OS package・installed VSIX E2Eを通し、検証済みartifactだけをGitHub Release、Marketplace、Open VSXへpublish

## 完了条件

- workflowは上記4 fileだけで、docs-only判定、gate job、Browser Playwright専用workflow・browser install・artifactを残さない。
- `check.yml`、`test.yml`、`playwright.yml`はすべてのPRと`main`への直接pushだけで起動する。feature branchと`next/v1`へのpushでは起動しない。
- `check.yml`はlint、format、4種のtypecheckだけを実行し、NLS、build、package、runtime test、releaseを実行しない。
- `test.yml`はOSごとに1つのjobで、最初に`pnpm run build`を実行し、その後`pnpm run test`と`pnpm run test:webview`を実行する。Extension Host failure時もbuild成功ならWebview testを実行し、既存の外部画像toolのinstall・verificationを維持する。Playwright、VSIX package/install、releaseは実行しない。
- `playwright.yml`はPRと`main`への直接pushで、lockfile固定install、build、runner一致VSIXのpackage、隔離extensions directoryへのinstall、隔離user-dataでのVS Code起動、installed VSIXのElectron Playwright、全一時directory cleanupを3 OSで順に実行する。
- Electron Playwrightは`LGH_VSIX_PATH`を必須とし、absolute path、存在する通常file、`.vsix`をcollection時に検証する。source directoryをExtension Development Hostとして読み込む経路は残さない。
- package済みVSIXのE2Eは、VSIX install、extension activation、Crop PDF Configure Webview、Hostとのmessage通信、VSIX由来のWebview assets/runtime dependency、packageされたSharpのloadと画像変換成功を確認する。全機能をE2Eへ重複させない。
- 失敗時にPlaywright report、trace、screenshot、test-results、VS Code/Extension Host logをartifactとして保存する。Extension Host用user-dataはupload後にcleanupする。
- `release.yml`はversion tagだけで起動し、publish jobが各OSでE2E済みのVSIX artifactをdownloadしてそのまま公開する。publish jobでbuild/package、静的検査、Extension Host test、Browser Playwrightを再実行しない。
- `package-vsix.mjs`のproduction staging、runtime manifest、runtime file copy、runner/target不一致拒否、`vsce package --target`の方針を維持し、pnpm起動は全platformで`shell:false`にする。
- Browser Playwright project、browser-only script、browser install、browser-only fixture/mockとtestを削除する。Browser testのうちprotocol/validation/state conversionはExtension Host testへ残し、実VS Codeで意味があるWebview表示・操作・message通信はpackage済みVSIX Electron E2Eで確認する。browser DOMだけを対象とするUI細部はJSDOM component testへ移し、Browser Playwrightの履歴は削除しない。
- product behavior、dependency、lockfile、対応platform、publish認証方式を変更しない。

## 実装方針

- YAMLの重複を完全には除かず、各workflowに必要な手順を明示する。reusable workflowや複雑なcomposite actionは追加しない。
- workflowからは既存の`package:vsix`と、package済みVSIX専用の小さなPlaywright入口を呼ぶ。
- VSIX E2Eは拡張機能の実commandを通してSharpをloadする。Playwright workerがinstalled extensionのnative moduleを直接importしてWindows cleanupを妨げないようにする。
- Browser suiteで確認していたprotocol serialization/validationはExtension Host test、実Webviewのcanvas・theme・Apply messageはinstalled VSIX Electron E2Eを正本とする。Browser DOMのみのzoom/layout/mocked-host細部はJSDOM component testで必要な操作契約だけを確認する。
- Extension Host testのCI logは`LGH_VSCODE_TEST_USER_DATA_DIR`で固定し、失敗時artifact upload、成功・失敗後のcleanupを明示する。
- pre-package Extension Hostとpackaged Electronは固定VS Code 1.128.0を使う。これは異なるtest contractとして維持する。

## 変更可能なファイル

- `.github/workflows/`
- `.gitignore`
- `.vscode-test.mjs`
- `package.json`
- `playwright.config.mjs`
- `scripts/package-vsix.mjs`
- `test/playwright/`
- 必要な小さな`test/` helper
- `docs/foundation/`
- `docs/tasks/0197-verify-cross-platform-vsix-release.md`
- `docs/tasks/README.md`
- `docs/adr/`
- `PROJECT_STATE.md`
- `docs/specs/internal/test-policy.md`
- 必要なpackage/CI仕様文書

## 対象外

- dependencyまたはlockfileの更新
- cross compile、対応platformの追加・削除
- アプリケーション機能・UI・変換実装の変更
- Mocha/Vitest移行、Extension Host testのPlaywright化、全test directoryの再配置
- release認証方式・version/hash/commit metadata管理の再設計
- 過去Task・researchに記録されたBrowser Playwright履歴の書き換え
- 既存Extension Host test全体の一時directory cleanup整理
- package-vsix専用unit test runnerの追加

## 関連

- [0180: パッケージ済みVSIXのオフライン3 OS smoke test](0180-add-packaged-vsix-offline-smoke-tests.md)
- [0194: CI・release・VSIX packagingを再現可能にする](0194-harden-ci-release-and-vsix.md)
- [ADR-0017: 配布済みVSIXをElectron E2Eとreleaseの検証単位にする](../adr/0017-use-installed-vsix-for-electron-e2e.md)
- [ADR-0018: pre-package testはVS Code Extension Hostで実行する](../adr/0018-use-extension-host-for-pre-package-tests.md)
- [test policy](../specs/internal/test-policy.md)
- [VSIX packaging仕様](../specs/internal/packaging.md)

## 確認方法

- `pnpm install --frozen-lockfile`
- `pnpm run build`
- `pnpm run check:all`
- `pnpm run test`
- `pnpm run test:webview`
- `pnpm run package:vsix`
- 生成した現在OS向けVSIXを隔離環境へinstallして`LGH_VSIX_PATH=... pnpm run test:playwright:vsix`を実行する。
- `git diff --check`

Linux、macOS、Windowsの最終的なpackage/install/Electron E2EはGitHub Actionsで確認する。ローカル未実行のOSを成功扱いにしない。

## 実施結果

- `check.yml`を`pnpm run check`だけにし、`check:test`の重複実行と存在しないscript参照を削除した。
- 4 workflowのpnpmを`11.13.1`へ統一した。
- `test`、`test:playwright`、`test:webview`からbuildを外し、各workflowで最初に`pnpm run build`を実行する構成にした。
- `test.yml`は3 OSでbuild、外部画像toolのinstall・verification、Extension Host test、JSDOM Webview component testを実行する。Extension Host failure時もbuild成功ならWebview testを実行する。
- Extension Host testのuser-data directoryを`LGH_VSCODE_TEST_USER_DATA_DIR`で固定し、failure artifact upload後に常にcleanupする。
- `playwright.yml`と`release.yml`は3 OSでbuild、runner-matched VSIX package、`LGH_VSIX_PATH`を指定した`test:playwright:vsix`を実行する。release publish jobは成功したVSIX artifactだけを再利用し、再build・再package・再testしない。
- Windows packagingは`npm_execpath`のpnpm JavaScript CLIをNodeから`shell:false`で起動する方式に統一した。
- `LGH_VSIX_PATH`はcollection時にabsolute path、通常file、`.vsix`を検証する。
- Browser-only runner、docs-only classifier、source directory fallbackは現行構成に残さず、過去のBrowser Playwright資料は履歴として保持した。
- 現行foundation docsのworkflow、script、runtime、test inventoryを更新した。

### ローカル確認

- `pnpm run build` 成功
- `pnpm run test:webview` 成功
- `pnpm run package:vsix -- --out <macOS VSIX>` 成功
- `pnpm run check:all`、`node --check scripts/package-vsix.mjs`、package/test/Webview typecheck 成功
- `pnpm run test:webview` 成功（crop 1、merge 1、split 2 cases）
- `pnpm run test`はmacOSのExtension Hostが応答不能になり120秒で未完了。baselineでも同じ症状を確認済み
- packaged Electron E2Eは`LGH_VSIX_PATH`を指定して成功（macOS、VS Code 1.128.0）。absolute path validationの相対path拒否も確認済み

### 未確認

- GitHub ActionsのLinux、macOS、Windowsでのbuild、Extension Host/JSDOM test、package、VSIX install、Electron E2E、Windows cleanup、release artifact download/publish前提は未実行。CIの成功を確認するまでStatusを`In Progress`のままにする。
