# v1 CI Evidence map

- 状態: 監査用draft
- 対象: `check.yml`, `test.yml`, `playwright.yml`, `release.yml`, root package scripts
- 重要: workflowが`pull_request`で起動することと、GitHub branch protectionでmerge必須に設定されていることは別である。後者はこの文書では`unknown`。
- test file / caseの完全列挙は[test-file-inventory](test-file-inventory.md)を参照する。過去のBrowser / Electron比較は履歴資料として[browser-electron-overlap](browser-electron-overlap.md)に残す。

## 1. Workflow map

| Workflow        | Trigger              | Docs-only behavior | Platform                | Main command / Evidence                         | Failure artifact                   | Evidence class                                                 |
| --------------- | -------------------- | ------------------ | ----------------------- | ----------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| Check           | PR、main push        | skipしない         | Linux                   | `npm run check`                                 | なし                               | lint、format、4種typecheck                                     |
| Test            | PR、main push        | skipしない         | Linux / macOS / Windows | `build` → `test` + `test:webview`               | Extension Host user-data directory | Host、operation、filesystem、JSDOM component test              |
| Playwright      | PR、main push        | skipしない         | Linux / macOS / Windows | `build` → VSIX package → `test:playwright:vsix` | Playwright report / test-results   | installed VSIX、Webview、theme、Host bridge、Sharp native load |
| Release package | tag                  | 対象外             | Linux / macOS / Windows | `build` → target VSIX package → Electron E2E    | `test-results/`, VSIX              | installed artifact、native dependency、packaged user journey   |
| Release publish | tag、package全成功後 | 対象外             | Linux                   | downloaded VSIX artifactsをpublish              | registry response                  | distribution action                                            |

## 2. Local command semantics

| Command                        | Includes                                       | Excludes                        | Interpretation                    |
| ------------------------------ | ---------------------------------------------- | ------------------------------- | --------------------------------- |
| `npm run check`                | lint、format、4種typecheck                     | runtime tests、package、NLS     | static verification               |
| `npm run build`                | clean、compile、test compile、Webview build    | runtime tests、package          | shared prerequisite               |
| `npm test`                     | fixed VS Code Extension Host test-cli          | Browser、Electron、package      | Host / operation integration      |
| `npm run test:webview`         | crop、merge、split JSDOM component tests       | PDF.js real rendering、Electron | fast component interaction checks |
| `npm run test:playwright:vsix` | Electron project with required `LGH_VSIX_PATH` | Browser、Host Mocha             | installed VSIX journey            |
| `npm run package:vsix`         | runner-matched target package                  | installed execution             | artifact creation only            |

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

### Packaged Electron on three OS

Playwright workflowはLinux、macOS、Windowsでrunner-matched VSIXをpackageし、`LGH_VSIX_PATH`でそのVSIXだけをElectronへinstallして実行する。

- real VS Code window / Webview
- VSIX由来のtheme、Host bridge、CSP、PDF.js canvas
- packaged dependencyとSharp native load
- OSごとのinstallation、path、native module差

Browser-only runnerやsource directory fallbackは現行構成に存在しない。過去のBrowser test記録は履歴資料として保持する。

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
- controlled external-fetch failureを確認するpackaged Webview

## 5. Gaps and misleading names

| ID         | Observation                                             | Risk                                                | Current handling                                   |
| ---------- | ------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| CI-GAP-001 | branch protectionのrequired statusが未確認              | workflow定義とmerge gateを混同                      | GitHub repository rulesetで別途確認                |
| CI-GAP-002 | 3 OSのpackage、VSIX install、Electron E2EはCI実測が必要 | local macOSだけではcross-platform successを証明不可 | GitHub Actionsの結果を正本にする                   |
| CI-GAP-003 | VSIX package failure時の詳細ログはrunner output中心     | package failureの再現情報が少ない                   | package commandのstdout/stderrとartifactを確認する |
| CI-GAP-004 | Electron E2EはreleaseとPRで同じpackaged journeyを実行   | runtime costは増える                                | installed VSIXの配布物contractを優先する           |

## 6. Candidate gate model

採用前の候補であり、まだworkflowを変更しない。

### PR static gate

- check: lint / format / four typechecks

### PR behavior gate

- 3 OS VS Code Extension Host
- 3 OS JSDOM Webview component tests
- 3 OS installed VSIX Electron E2E

### PR Electron gate

候補:

- Linux critical journey 1件
- Webview / command / packaging関連path変更時だけ
- full Electronはmanual / scheduled

### Pre-release / release candidate gate

- 3 OS package
- 3 OS installed VSIX smoke
- native dependency
- complete offline behaviorの未証明
- external tool missing behavior

### Tag publish gate

- pre-release Evidenceを再利用できるか検討
- current workflowのようにtagから再packageする場合、同じsource SHAであることを明示

## 7. Required decisions

1. branch protection上で必須とするstatus名
2. GitHub ActionsのLinux / macOS / Windows実測結果
3. release artifact download / publish前提の実行結果

## 8. Correction to the initial audit

初稿では`.github/workflows/check.yml`だけを確認し、「通常PRはruntime testへ接続されていない」と記録した。これは誤りだった。

実際には、現行workflowは次のように分離している。

- `check.yml`がstatic checkを実行する
- `test.yml`が3 OSのbuild、VS Code Extension Host、JSDOM component testを実行する
- `playwright.yml`が3 OSのbuild、runner-matched VSIX package、installed VSIX Electron E2Eを実行する
- `release.yml`が同じpackaged E2Eを通過したVSIXだけをpublishする

Browser-only runner、docs-only classifier、source directory fallbackは現行構成から除去し、過去の監査資料は履歴として保持する。
