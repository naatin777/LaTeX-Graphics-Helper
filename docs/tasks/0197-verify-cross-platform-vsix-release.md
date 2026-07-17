# CI・Playwright・VSIX releaseを4 workflowへ整理する

## Status

In Progress

## 目的

GitHub Actionsを次の4 workflowへ整理し、Electron Playwrightの対象を、必ず直前にpackage・installしたVSIXだけに統一する。

- `check.yml`: lint、format、production/test/Webview/Webview testのtypecheck
- `test.yml`: Node testとVS Code Extension Host testをLinux、macOS、Windowsで実行
- `playwright.yml`: build、runner一致VSIXのpackage・install、installed VSIXのElectron Playwrightを3 OSで実行
- `release.yml`: tag pushで同じ3 OS package・installed VSIX E2Eを通し、検証済みartifactだけをGitHub Release、Marketplace、Open VSXへpublish

## 完了条件

- workflowは上記4 fileだけで、docs-only判定、gate job、Browser Playwright専用workflow・browser install・artifactを残さない。
- `check.yml`、`test.yml`、`playwright.yml`はすべてのPRと`main`への直接pushだけで起動する。feature branchと`next/v1`へのpushでは起動しない。
- `check.yml`はlint、format、4種のtypecheckだけを実行し、NLS、build、package、runtime test、releaseを実行しない。
- `test.yml`はOSごとに1つのjobで`pnpm run test`を実行し、Node testとExtension Host testを各1回ずつ実行する。既存の外部画像toolのinstall・verificationを維持し、Playwright、VSIX package/install、releaseは実行しない。
- `playwright.yml`はPRと`main`への直接pushで、lockfile固定install、build、runner一致VSIXのpackage、隔離extensions directoryへのinstall、隔離user-dataでのVS Code起動、installed VSIXのElectron Playwright、全一時directory cleanupを3 OSで順に実行する。
- Electron Playwrightは`LGH_VSIX_PATH`を必須とし、未指定時は明確に失敗する。source directoryをExtension Development Hostとして読み込む経路は残さない。
- package済みVSIXのE2Eは、VSIX install、extension activation、Crop PDF Configure Webview、Hostとのmessage通信、VSIX由来のWebview assets/runtime dependency、packageされたSharpのloadと画像変換成功を確認する。全機能をE2Eへ重複させない。
- 失敗時にPlaywright report、trace、screenshot、test-results、VS Code/Extension Host logをartifactとして保存する。
- `release.yml`はversion tagだけで起動し、publish jobが各OSでE2E済みのVSIX artifactをdownloadしてそのまま公開する。publish jobでbuild/package、静的検査、Node test、Extension Host test、Browser Playwrightを再実行しない。
- `package-vsix.mjs`のproduction staging、runtime manifest、runtime file copy、runner/target不一致拒否、`vsce package --target`の方針を維持する。
- Browser Playwright project、browser-only script、browser install、browser-only fixture/mockとtestを削除する。Browser testのうちprotocol/validation/state conversionは既存Node testへ残し、実VS Codeで意味があるWebview表示・操作・message通信はpackage済みVSIX Electron E2Eで確認する。browser DOMだけを対象とするUI細部は削除理由を本taskの結果へ記録する。
- product behavior、dependency、lockfile、対応platform、publish認証方式を変更しない。

## 実装方針

- YAMLの重複を完全には除かず、各workflowに必要な手順を明示する。reusable workflowや複雑なcomposite actionは追加しない。
- workflowからは既存の`package:vsix`と、package済みVSIX専用の小さなPlaywright入口を呼ぶ。
- VSIX E2Eは拡張機能の実commandを通してSharpをloadする。Playwright workerがinstalled extensionのnative moduleを直接importしてWindows cleanupを妨げないようにする。
- Browser suiteで確認していたprotocol serialization/validationはNode test、実Webviewのcanvas・theme・Apply messageはinstalled VSIX Electron E2Eを正本とする。Browser DOMのみのzoom/layout/mocked-host細部は実VS Codeの契約ではないため削除する。

## 変更可能なファイル

- `.github/workflows/`
- `package.json`
- `playwright.config.mjs`
- `test/playwright/`
- 必要な小さな`test/` helper
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

## 関連

- [0180: パッケージ済みVSIXのオフライン3 OS smoke test](0180-add-packaged-vsix-offline-smoke-tests.md)
- [0194: CI・release・VSIX packagingを再現可能にする](0194-harden-ci-release-and-vsix.md)
- [ADR-0017: 配布済みVSIXをElectron E2Eとreleaseの検証単位にする](../adr/0017-use-installed-vsix-for-electron-e2e.md)
- [test policy](../specs/internal/test-policy.md)
- [VSIX packaging仕様](../specs/internal/packaging.md)

## 確認方法

- `pnpm install --frozen-lockfile`
- `pnpm run lint`
- `pnpm run format`
- `pnpm run typecheck`
- `pnpm run typecheck:test`
- `pnpm run typecheck:webview`
- `pnpm run typecheck:webview:test`
- `pnpm run test`
- `pnpm run build`
- `pnpm run package:vsix`
- 生成した現在OS向けVSIXを隔離環境へinstallしてElectron Playwrightを実行する。
- `git diff --check`

Linux、macOS、Windowsの最終的なpackage/install/Electron E2EはGitHub Actionsで確認する。ローカル未実行のOSを成功扱いにしない。

## 実施結果

- `check.yml`を`check`と`check:test`だけへ絞り、NLS、RuleSync、build、package、runtime testを外した。
- `check.yml`、`test.yml`、`playwright.yml`はPRと`main`への直接pushだけで起動するため、feature branchおよび`next/v1`へのpushとPR eventが重複して実行されない。
- `test.yml`はOSごとに1つの`test` jobにし、`pnpm run test`からNode testとExtension Host testを順に実行する。外部画像toolのinstall・verificationは維持した。
- `playwright.yml`はdocs-only判定、gate、Browser installを削除し、3 OSでbuild、current runnerのVSIX package、installed VSIX Electron Playwrightを実行する。
- `release.yml`は3 OSで同じpackage済みVSIX E2Eを実行し、成功したVSIX artifactだけをpublish jobへ渡す。publish jobは再build・再packageしない。
- Browser Playwright project、browser script、browser-only test、browser install、未使用docs-only判定script、検証専用workflowを削除した。
- Browser suiteのprotocol/validationは既存Node testに残っている。browser DOMだけのlayout、zoom、mocked Host操作は実VS Codeの配布物契約を証明しないため削除した。実Webviewのcanvas、theme、Apply messageはpackage済みVSIX Electron E2Eで確認する。
- Electron E2EはVSIX pathを必須にし、source directoryをExtension Development Hostとして起動するfallbackを削除した。Crop ConfigureとPNG-to-JPEG commandをinstalled extensionで実行し、Sharpをpackage内からloadする。
- 失敗時にはHTML report、trace、screenshot、diagnostic、VS Code/Extension Host logを`test-results/`へ残す。testのtemporary workspace、user-data、extensions directoryは成功・失敗のどちらでも削除を要求する。

### ローカル確認

- `pnpm install --frozen-lockfile` 成功
- `pnpm run check`、`pnpm run check:test` 成功（既存lint warningのみ）
- `pnpm run test` 成功（Node 18件とExtension Host）
- `pnpm run build`、現在OS向け`package:vsix` 成功
- VSIX pathなしの`pnpm run test:playwright`は、source fallbackせず明示的に失敗することを確認
- package済みVSIX E2EはmacOSのVS Code LaunchServices起動失敗によりローカルでは実行できなかった。diagnostic、trace、log artifactの出力は確認した。

### 未確認

- GitHub ActionsのLinux、macOS、Windowsでのpackage、VSIX install、Electron E2E、Windows cleanup、release artifact download/publish前提は未実行。CIの成功を確認するまでStatusをDoneにしない。
