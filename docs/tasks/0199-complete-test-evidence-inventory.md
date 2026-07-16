# Task: v1 test Evidence inventoryを完了する

## Status

Done

## Scope

対象は`origin/next/v1` at `75ca52a53df947dfbd4b07709ef538b6e056fdc8`。このtaskではtestの移動・削除・リファクタリング、Vitest採用、Browser/Electronのrunner変更、production/config/CI/dependency変更を行わず、現在のrepository tree・test・config・script・workflowからEvidenceを再監査した。

## Confirmed Evidence

- Git管理下のtest implementationは47 files: root Mocha/Extension Host 45、Browser Playwright 1、Electron Playwright 1。
- statically declared caseは226: configured Host 207、Browser 18、Electron 1。Vitest configured scopeは0。
- `.vscode-test.mjs`の`out/test/**/*.test.js`により、rootのNode-level contractも現在はExtension Hostで実行される。
- source dependency graphとhelperを追うと、Node-level候補23 files、transitive/current VS Code dependencyを持つ22 filesとなる。後者には`split_pdf_all_pages`のvisual helper、`merge_pdf_operation`/`undo_last_conversion`のcommand-layer import、`latex_snippet`の`SnippetString`、`output_conversion_messages`のlocale環境が含まれる。
- Browser specは18の異なるrenderer/browser/message-simulation oracleを持つ。PDF.js、canvas pixels、DPI、lazy render、scroll、zoomはBrowser固有の価値があるが、fake `acquireVsCodeApi`によるmessage caseはactual Host bridgeではない。
- Electron specは1 caseだが、critical journey、actual Webview、theme/computed style、visual snapshot、final PDF、packaged controlled external-fetch failure、internal module import、Sharp native、missing external CLI、test harness diagnosticsを混在させる。
- `test:all`のconfigured scopeはHost + Browserの225 statically declared caseで、Electron、packaged VSIX、Vitestを含まない。actual executed countはinventoryから断定しない。
- `test.yml`は3 OS HostとLinux development Electron、`playwright.yml`は3 OS Browser、`release.yml`は3 OS packaged VSIX smokeを実行する。workflow trigger/job successとbranch protection required statusは別であり、後者はauthenticated GitHub accessがなくunknownとした。
- `run_external_tool.test.ts`のcase名はsignalを掲げるが、実際のcallにAbortSignalはなく、cancellation Evidenceとは扱えない。
- ASCII scratchのtest fileは存在する。既存foundationの「scratch専用test file未取得」という記録は誤りであり、存在を確認済みである。
- 要求された`pnpm run format:check`は現行`package.json`に存在しない。既存の`format` scriptもMarkdown docsを対象にしないため、検証結果と別task候補へ記録する。

詳細は以下を参照する。

- [test-file-inventory](../foundation/test-file-inventory.md): 47 file、226 case、runtime、dependency、required runtime仮説、Node候補、Host残存候補、責務混在
- [browser-electron-overlap](../foundation/browser-electron-overlap.md): Browser 18 case、Electron sub-group、case-level overlap
- [evidence-gaps](../foundation/evidence-gaps.md): capability/spec/test/Host/failure/Safe/Undo/cancel/platform/package/CI gap

## Findings separated by type

### Evidence gaps

- Quick cropとSplitはoperation/registration Evidenceはあるが、public command execution/picker journeyが専用caseとして接続されていない。
- Mergeにはcommand/operation testがあるが、専用の利用者向けspecがない。
- generic output conversionのsource/backend/failure matrix、per-format cancellation/Undo/Safe Mode、native codec/platform Evidenceが横断的に接続されていない。
- Safe Mode dialog/status testsはAPI surfaceをSinonで置換し、actual workbench UIを証明しない。
- Electronのactual selected-page/cancel/invalid-input path、Browserのsimulated bridgeとactual bridgeの差が未接続である。
- packaged smokeはrelease tagでのみ実行され、PR/pre-release required statusは未決である。
- workflow branch protection required status、registry publish acceptance、ACL/TOCTOU、UNC edgeはunknownまたはspec外であり、推測しない。

### Test architecture issues

- current Host globがNode-level testを含む。
- Browser 1,068-line specがfixture generation、local server、renderer、browser compatibility、message simulationを所有する。
- Electron 376-line specの1 caseがjourney/visual/package/native/internal/harnessを所有する。
- PDF visual helperがVS Code settingを読み、required runtimeがfile pathから見えない。
- command test、operation test、provider test、artifact lifecycleの責務境界が同じfile/fixtureに混在する。

### Production architecture issues (not changed)

`LatexSnippet`の`SnippetString`、`localeMap`のmodule-scope `vscode.env.language`、command-layer record import、manifest testのactivation module importは、future Node boundary experimentの前提に影響する。production architecture issueとして記録するだけで、このtaskでは修正しない。

## Selection Gate

今回決めたことではなく、maintainerが次に選択するためのEvidenceと条件を残す。

| Gate                       | Current status      | Required selection Evidence                                                                                                                         |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser scope              | Experiment required | B-01〜B-18ごとのElectron equivalence、flake、duration、failure diagnosis、PDF.js/DPI/lazy/scrollの価値                                              |
| Electron required scope    | Experiment required | Linux PR、path-filtered、manual/scheduled、release-onlyのcostとrisk、package sub-group分離                                                          |
| Node/Vitest                | Experiment required | P0/P1候補のcold/warm時間、3 OS、hidden dependency、Mocha→Vitest assertion/fixture差、AbortSignal/symlink/nativeの診断                               |
| Host retention             | Ready for decision  | activation、command registry/configuration、provider/DataTransfer/Document API、notification/progress/globalState、actual URI/WebviewをHostに残すか |
| Capability Evidence policy | Ready for decision  | quick crop/split command journey、conversion source matrix、per-capability Safe/Undo/cancel、required platform/package scope                        |
| Merge formal spec          | Ready for decision  | selected files/order/save dialog/output/failure contractを`docs/specs/`へ追加するか                                                                 |
| Packaging timing           | Experiment required | tag-onlyでよいか、pre-release/manual/scheduled/package smokeを要求するか                                                                            |
| Branch protection          | Unknown             | authenticated GitHub ruleset/branch protection readが必要                                                                                           |

## Files allowed for this task

- `docs/foundation/test-file-inventory.md`
- `docs/foundation/browser-electron-overlap.md`
- `docs/foundation/evidence-gaps.md`
- minimal factual updates to existing foundation/task index documents

No production code, test, fixture, screenshot, package script, config, workflow, dependency, Skill, or `AGENTS.md` was changed.

## Verification result

整合修正後に実行した結果を記録する。`pnpm run format:check`は現行`package.json`に存在しないため、changed Markdownにはinstalled Oxfmtを明示実行する。

| Command                       | Result      | Notes                                                                                                      |
| ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `git status --short`          | pass        | 最終添削時の追加差分は2個のMarkdownだけだった                                                              |
| `git diff --check`            | pass        | whitespace/errorなし                                                                                       |
| `pnpm run check:nls`          | pass        | NLS consistency OK (220 keys)                                                                              |
| `pnpm run check:all`          | pass        | lint warningは既存コード由来。lint、format、typecheck、NLSを完了                                           |
| `pnpm run format:check`       | unavailable | repositoryにscriptが存在しない                                                                             |
| explicit Markdown Oxfmt check | pass        | baseとの差分とworking treeのchanged Markdown 11 filesに`pnpm exec oxfmt --check`を実行                     |
| docs-only workflow behavior   | confirmed   | detector実行結果は`docs_only=true`。`docs/*`変更はtest/playwright runtime jobをskipし、Check jobは実行する |
