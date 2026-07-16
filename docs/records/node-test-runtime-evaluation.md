# Node test runtime evaluation

## Question

Node-level contractを、VS Code Extension Hostではなくplain Nodeで実行する価値があるか。

## Local experiment

### Scope

- `test/source_format.test.ts`
- `test/crop_pdf_protocol.test.ts`
- `test/resolve_output_path.test.ts`
- `test/file_content_hash.test.ts`
- `test/safe_mode.test.ts`
- 5 test files / 18 cases / 31 assertion expressions / 0 skipped

BaselineはVS Code Extension Host + Mocha、experimentはplain Node + Mochaとした。同じtest sourceをHostとNodeの両方で実行し、test case、assertion、failure conditionの削除・弱体化・複製は行っていない。

Baseline scriptは`test:vscode` → `build:test` → `vscode-test`、Host runtimeは固定versionのVS Code 1.128.0 Extension Host + Mochaだった。Node scriptは`test:node:experiment`で、`build:test:node:experiment`後に5つのcompiled JavaScript fileをplain Node + Mochaへ渡した。既存の`compile`と`compile:test`、source mapを使い、追加configやWebview compileは行わない。

### Correctness

| Test                          | Host    | Node    | Same cases | Same assertions |
| ----------------------------- | ------- | ------- | ---------- | --------------- |
| `source_format.test.ts`       | 1 pass  | 1 pass  | Yes        | Yes, 6          |
| `crop_pdf_protocol.test.ts`   | 2 pass  | 2 pass  | Yes        | Yes, 3          |
| `resolve_output_path.test.ts` | 12 pass | 12 pass | Yes        | Yes, 12         |
| `file_content_hash.test.ts`   | 1 pass  | 1 pass  | Yes        | Yes, 4          |
| `safe_mode.test.ts`           | 2 pass  | 2 pass  | Yes        | Yes, 6          |

TotalはHost 18 passing / 0 failing / 0 skipped、Node 18 passing / 0 failing / 0 skipped。

### Timing

| Mode                       | Run 1 | Run 2 | Run 3 | Median | Notes                                                       |
| -------------------------- | ----: | ----: | ----: | -----: | ----------------------------------------------------------- |
| Host build + selected test | 5.79s | 5.83s | 5.88s |  5.83s | `build:test` + Host `--run`; VS Code download cache present |
| Host test only, selected   | 3.13s | 2.70s | 2.54s |  2.70s | compiled JS + Extension Host startup                        |
| Node build + selected test | 2.89s | 2.83s | 2.85s |  2.85s | Webview compile excluded by design                          |
| Node test only, selected   | 0.11s | 0.10s | 0.09s |  0.10s | compiled JS + plain Node + Mocha                            |

Full Host `test:vscode` warmは26.44s / 26.71s / 28.83s（median 26.71s、211 passing）。cold 53.37sはVS Code 1.128.0のDarwin arm64 package downloadを含む。

### Failure diagnostics

意図的failureは`source_format.test.ts`の期待値を一時的に変更して比較し、commit前に復元した。

| Criterion                | Host                                                     | Node                                    | Better |
| ------------------------ | -------------------------------------------------------- | --------------------------------------- | ------ |
| failure message          | `AssertionError [ERR_ASSERTION]`、17 passing / 1 failing | 同じ                                    | 同等   |
| expected / actual        | 同じdiff                                                 | 同じdiff                                | 同等   |
| test fileと行番号        | `out/test/source_format.test.js:6:16`                    | `test/source_format.test.ts:13:12`      | Node   |
| stack trace / source map | compiled JS path、Host出力はTSへ逆引きしない             | TS sourceへ逆引き                       | Node   |
| cleanup後の状態          | temp artifactはclean。VS Code stateはrunner管理          | temp artifactはclean。VS Code stateなし | Node   |
| runner固有noise          | VS Code startup、AccountPolicy、cached-data warning等    | なし                                    | Node   |

### Dependency findings

| Test                          | Direct dependency                                                                                       | Transitive dependency                                 | Node status                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `source_format.test.ts`       | test: `node:assert/strict`; source: `node:path`                                                         | `vscode`: none                                        | Ready                                     |
| `crop_pdf_protocol.test.ts`   | test: `node:assert/strict`; source: none                                                                | `vscode`: none                                        | Ready                                     |
| `resolve_output_path.test.ts` | test: `node:assert/strict`, `node:path`; source: `node:path`, `process.platform`                        | `vscode`: none                                        | Ready; win32/posix is explicitly injected |
| `file_content_hash.test.ts`   | test/source: `node:assert/strict`, `node:crypto`, `node:fs`, `node:fs/promises`, `node:os`, `node:path` | `vscode`: none; no fixture/helper                     | Ready                                     |
| `safe_mode.test.ts`           | test: `node:assert/strict`; source: none at runtime                                                     | `vscode`: none; `MemoryState` is a local test adapter | Ready                                     |

選定5件のdirect / transitive graphにtop-level `vscode` import、fixture依存、Host専用helper、cwd依存、extension activation、global initializationはなかった。`resolve_output_path.test.ts`はwin32/posixを明示的に注入し、`safe_mode.test.ts`はlocal `MemoryState` adapterを使う。Node source mapにより元のTypeScript行を表示できた。

### Limitations

- Local実行はmacOS Darwin arm64のみ。
- Node runtimeのtested subset全体への一般化はしていない。
- CI、required status、permanent directory、正式script名、Mocha / Vitest比較は未決定。

### Local verification

| Command                          | Result | Notes                                |
| -------------------------------- | ------ | ------------------------------------ |
| `pnpm install --frozen-lockfile` | pass   | lockfile unchanged                   |
| `pnpm run check:nls`             | pass   | NLS consistency OK                   |
| `pnpm run check:all`             | pass   | existing lint warnings only          |
| `pnpm run test:node:experiment`  | pass   | 18 passing / 0 skipped               |
| `pnpm run test:vscode`           | pass   | 211 passing; selected scope 18 cases |

Local experimentの判定は**Successful experiment**だが、これはtested subsetのlocal Evidenceに限る。overall decision statusはcross-platformとmaintainer判断が未完了のためPendingとする。

## CI matrix experiment

### Design

- Workflow: `.github/workflows/test.yml`
- Job: 独立した`node-test-experiment`
- Matrix: `ubuntu-latest`、`macos-latest`、`windows-latest`
- Command: `pnpm run test:node:experiment`
- docs-only変更では既存`changes` jobの`docs_only` outputを使ってskipする。
- `pnpm install --frozen-lockfile`のみを行い、VS Code、Xvfb、Ghostscript、pdftocairo、rsvg-convert、Draw.io、Playwright等はinstallしない。
- `continue-on-error`、retry、failureを成功扱いするwrapperは使わない。
- jobは通常のcheckとして実行し、required status化は決めない。

### Remote results

この整理時点ではGitHub Actions remote Evidenceを取得していない。

| OS      | Workflow result | Cases | Skipped | Duration | Node version |
| ------- | --------------- | ----: | ------: | -------: | ------------ |
| Linux   | Pending         |       |         |          |              |
| macOS   | Pending         |       |         |          |              |
| Windows | Pending         |       |         |          |              |

## Observations

- 同じ5 test sourcesをHostとNodeで実行し、18 cases / 31 assertion expressionsを両方でpassさせられた。
- selected test-onlyの中央値はHost 2.70s、Node 0.10sだった。
- Node側はWebview compileと全Host suiteを含めないため、build+testの差はruntimeだけの比較ではない。
- Node実行ではVS Code startup noiseがなく、source-mapによりTypeScript lineを表示できた。
- CIの3 OS結果はまだ観測していない。

## Interpretation

tested subsetについては、Node runtime分離がlocal feedbackとfailure diagnosisに価値を持つEvidenceが得られた。一方、これだけでNode runtime正式採用、Hostからの除外、P0全体への拡張を決めることはできない。

## Unknowns

- Linux・macOS・Windowsのremote correctness、case数、skip数、duration
- Windows filesystem / permission差とCI cacheの影響
- tested subsetを拡張した場合のhidden dependency
- required status化の価値
- Hostとの重複期間
- Node MochaとNode Vitestの比較

## Decision status

Pending
