# v1 CI Evidence map

- 状態: 監査用draft
- 対象: `check.yml`, `test.yml`, `playwright.yml`, `release.yml`, root package scripts
- 重要: workflowが`pull_request`で起動することと、GitHub branch protectionでmerge必須に設定されていることは別である。後者はこの文書では`unknown`。

## 1. Workflow map

| Workflow | Trigger | Docs-only behavior | Platform | Main command / Evidence | Failure artifact | Evidence class |
|---|---|---|---|---|---|---|
| Check | PR、main push | skipしない | Linux | `pnpm run check:all` | なし | lint、format、TypeScript、NLS静的整合 |
| Test | PR、main push | runtime jobsをskip | Linux / macOS / Windows | `pnpm run test` = VS Code Extension Host tests | `test-results/` | activation、command、workspace、operation、filesystem、external tool integration |
| Test: Electron step | Test workflow内 | docs-only時はjob自体skip | Linuxのみ | `test:playwright:electron` | `test-results/` | development extensionのreal VS Code journey |
| Playwright | PR、main push | browser matrixをskipし、gateがskip結果を検証 | Linux / macOS / Windows | `test:playwright` | Playwright report / test results | Browser renderer / PDF.js / canvas |
| Release verify | tag | 対象外 | Linux | `check:all`, build | なし | release source static verification |
| Release package | tag | 対象外 | Linux / macOS / Windows | target VSIX package + packaged Electron smoke | `test-results/`, VSIX | installed artifact、Sharp native load、offline / external tool boundary |
| Release publish | tag、package全成功後 | 対象外 | Linux | GitHub Release、Marketplace、Open VSX | registry response | distribution action |

## 2. Local command semantics

| Command | Includes | Excludes | Recommended interpretation before rename |
|---|---|---|---|
| `pnpm run check:all` | lint、format、extension / test / Webview typecheck、NLS | runtime tests、package | static verification |
| `pnpm run test` | `test:vscode` | Browser、Electron、package | Extension Host suite |
| `pnpm run test:vscode` | build:test + fixed VS Code test-cli | Browser、Electron | Host / operation integration |
| `pnpm run test:playwright` | build + Browser project | Electron | renderer suite |
| `pnpm run test:playwright:electron` | build + Electron project | Browser | real VS Code journey。`LGH_VSIX_PATH`設定時はpackaged mode |
| `pnpm run test:all` | VS Code + Browser | Electron、packaged smoke、Vitest | historical aggregate。全required Evidenceを意味しない |
| `pnpm run package:vsix` | target package | installed execution | artifact creation only |

## 3. PR Evidence currently available

### Static

- lint
- format
- production TypeScript
- test TypeScript
- Webview production / test TypeScript
- NLS key / placeholder consistency

### Runtime on three OS

Test workflowはLinux、macOS、WindowsでVS Code Extension Host suiteを実行する。

現在このsuiteへ混在するもの:

- real VS Code activation / command / provider
- pure data / protocol
- Node filesystem safety
- PDF / image operation
- external tool wrapper

したがって3 OS Evidence自体は存在するが、test failureがVS Code integration由来かpure operation由来かをjob名から判断しにくい。

### Browser on three OS

Playwright workflowはBrowser projectをLinux、macOS、Windowsで実行する。

これは次のEvidenceを提供する。

- Chromium / bundled browser上のPDF.js
- canvas / layout / high-DPI
- Browser runnerのOS差

実VS Code themeやHost bridgeのEvidenceではない。

### Electron on Linux

Test workflowはLinuxでElectron projectを追加実行する。

- development extension path
- real VS Code window / Webview
- Crop Configure journey

macOS / WindowsのElectron development journeyは通常PRでは実行しない。

## 4. Release Evidence

release package jobは各native runnerで次を実行する。

1. dependency install
2. build
3. runnerに一致するVSIX targetをpackage
4. VSIXを実VS Codeへinstall
5. Electron specをpackaged modeで実行
6. Crop Configureを操作
7. PNG→JPEGでSharp native dependencyを確認
8. missing `pdftocairo` error boundaryを確認

これにより、development extension testでは得られない次を確認する。

- `.vscodeignore` / package content
- production dependency deployment
- native Sharp binary
- installed extension discovery
- network block下のpackaged Webview

## 5. Gaps and misleading names

| ID | Observation | Risk | Correction candidate |
|---|---|---|---|
| CI-GAP-001 | `test:all`にElectron / package / Vitestが含まれない | 人間・AIが「全test完了」と誤認 | 採用後に`test:host-and-browser`等へrename、または`test:required` / `test:full`を定義 |
| CI-GAP-002 | VS Code suiteへpure / operation / Host testが混在 | failure diagnosisとlocal feedbackが重い | Node experiment後にjobを分離 |
| CI-GAP-003 | Electron development journeyはPRでLinuxのみ | macOS / Windows UI / Electron差はreleaseまで未実行 | required qualityとflake costを比較してscope決定 |
| CI-GAP-004 | packaged smokeはtag release時 | release直前にpackage regressionが初発見される可能性 | manual / scheduled / path-filtered pre-release jobを候補化 |
| CI-GAP-005 | Browser projectは3 OS、visual goldenはLinuxだけ | runner costと得るEvidenceの対応が不明瞭 | test caseごとに3 OSが必要か分類 |
| CI-GAP-006 | branch protectionのrequired statusが未確認 | workflow定義とmerge gateを混同 | repository ruleset / branch protectionを別途確認 |
| CI-GAP-007 | docs-only判定がTest / PlaywrightにありCheckにはない | docs PRでもstatic checkは実行、runtimeはskip | 意図として妥当か明文化 |

## 6. Candidate gate model

採用前の候補であり、まだworkflowを変更しない。

### PR static gate

- check: lint / format / typecheck / NLS

### PR fast behavior gate

- Node contract tests
- VS Code Host critical integration

### PR renderer gate

候補:

- Webview関連path変更時だけBrowser Playwright
- 現状どおり全non-doc changeで3 OS

### PR Electron gate

候補:

- Linux critical journey 1件
- Webview / command / packaging関連path変更時だけ
- full Electronはmanual / scheduled

### Pre-release / release candidate gate

- 3 OS package
- 3 OS installed VSIX smoke
- native dependency
- offline Webview
- external tool missing behavior

### Tag publish gate

- pre-release Evidenceを再利用できるか検討
- current workflowのようにtagから再packageする場合、同じsource SHAであることを明示

## 7. Required decisions

1. branch protection上で必須とするstatus名
2. v1のrequired platform: install / operation / Electron journey / visualの各範囲
3. Browser Playwrightを3 OSで実行するcontract
4. Linux Electronを全PRで実行するかpath-filterするか
5. tag前にpackaged smokeを実行するrelease candidate導線の要否
6. `test:required`, `test:full`, `test:release`のような意味scriptを導入するか

## 8. Correction to the initial audit

初稿では`.github/workflows/check.yml`だけを確認し、「通常PRはruntime testへ接続されていない」と記録した。これは誤りだった。

実際には:

- `test.yml`が3 OSのVS Code testとLinux Electronを実行する
- `playwright.yml`が3 OSのBrowser Playwrightを実行する

この誤りは`v1-development-foundation-audit.md`とDraft PR説明で訂正する。
