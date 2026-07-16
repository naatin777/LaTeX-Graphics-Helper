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

Baseline scriptは`test:vscode` → `build:test` → `vscode-test`、Host runtimeは固定versionのVS Code 1.128.0 Extension Host + Mochaだった。実験時のNode scriptは`test:node:experiment`で、`build:test:node:experiment`後に5つのcompiled JavaScript fileをplain Node + Mochaへ渡した。既存の`compile`と`compile:test`、source mapを使い、追加configやWebview compileは行わない。

正式化後は`test:node` → `build:test:node`をNode経路とし、`test:vscode`は全体globから選定5 filesを複数の`--ignore`で除外する。`pnpm test`はNode経路と残りのExtension Host経路を順に実行する。

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
- 3 OSのremote Evidenceにはjob durationが含まれていない。
- required statusは設定せず、Node subset expansionとNode Mocha / Vitest comparisonは今回行っていない。

### Local verification

| Command                          | Result | Notes                                              |
| -------------------------------- | ------ | -------------------------------------------------- |
| `pnpm install --frozen-lockfile` | pass   | lockfile unchanged                                 |
| `pnpm run check:nls`             | pass   | NLS consistency OK                                 |
| `pnpm run check:all`             | pass   | existing lint warnings only                        |
| `pnpm run test:node`             | pass   | 18 passing / 0 skipped                             |
| `pnpm run test:vscode`           | pass   | 193 passing; selected 5 files absent from Host log |
| `pnpm test`                      | pass   | Node 18 + Host 193 passing                         |
| `pnpm run test:all`              | pass   | Node 18 + Host 193 + Browser 18 passing            |

Local experimentの判定は**Successful experiment**だった。正式化後のlocal EvidenceではNodeが18 casesを実行し、Hostは選定5 filesを除外して193 casesを実行した。

## CI matrix

### Design

- Workflow: `.github/workflows/test.yml`
- Job: 独立した`node-test`
- Matrix: `ubuntu-latest`、`macos-latest`、`windows-latest`
- Command: `pnpm run test:node`
- docs-only変更では既存`changes` jobの`docs_only` outputを使ってskipする。
- `pnpm install --frozen-lockfile`のみを行い、VS Code、Xvfb、Ghostscript、pdftocairo、rsvg-convert、Draw.io、Playwright等はinstallしない。
- `continue-on-error`、retry、failureを成功扱いするwrapperは使わない。
- jobは通常のcheckとして実行し、required status化は決めない。

### Remote results

PR #356のTest workflow run [#444](https://github.com/naatin777/LaTeX-Graphics-Helper/actions/runs/29506886218)で、独立した`node-test-experiment` jobの結果を確認した。各jobは正式化前の`pnpm run test:node:experiment`を実行し、Node 22で完了した。正式化後は同じ3 OS matrixを`node-test` / `pnpm run test:node`として恒久的に維持する。job durationは取得できるEvidenceに含まれていないため、推測しない。

| OS      | Workflow result | Cases | Skipped | Node version | Duration     |
| ------- | --------------- | ----: | ------: | ------------ | ------------ |
| Linux   | Pass            |    18 |       0 | 22           | Not captured |
| macOS   | Pass            |    18 |       0 | 22           | Not captured |
| Windows | Pass            |    18 |       0 | 22           | Not captured |

## Observations

- 実験では同じ5 test sourcesをHostとNodeで実行し、18 cases / 31 assertion expressionsを両方でpassさせられた。
- 正式状態ではNodeが5 files / 18 casesをownerとして実行し、Hostから同じ5 filesを除外して重複を終了した。今回のローカルHost実行は残り193 casesがpassした。
- Node 18 cases + Host 193 casesで、既存の211 cases相当のcontract coverageを維持した。
- selected test-onlyの中央値はHost 2.70s、Node 0.10sだった。
- Node側はWebview compileと全Host suiteを含めないため、build+testの差はruntimeだけの比較ではない。
- Node実行ではVS Code startup noiseがなく、source-mapによりTypeScript lineを表示できた。
- CIの3 OSで、同じ18 casesが0 skippedでpassした。このEvidenceとローカルのNode/Host分離結果に基づき、tested subsetのNode runtimeを正式採用する。

## Interpretation

tested subsetについては、Node runtime分離がlocal feedbackとfailure diagnosisに価値を持つEvidenceが得られた。3 OSのpass結果とHost oracleの境界を合わせ、tested subsetに限ってNode runtimeを正式採用する。P0全体への拡張は行わない。

## Unknowns

- Linux・macOS・Windowsのjob duration
- Windows filesystem / permission差とCI cacheの影響
- tested subsetを拡張した場合のhidden dependency
- required status化の価値
- Hostから除外した5 files以外のruntime境界
- Node MochaとNode Vitestの比較
- required statusを設定しない場合の運用上の効果

## Final decision

- Decision: tested subsetのNode runtimeを正式採用
- Runner: Node 22 + Mocha
- Node CI: Linux、macOS、Windowsを恒久的に維持
- Host overlap: 選定5 filesはこのPRでHostから除外し、重複実行を終了
- Required status: 今回は設定しない
- Vitest comparison: 今回は行わない
- Node subset expansion: 今回は行わない

採用理由は、3 OSで18 cases / 0 skippedのpassを確認でき、Node側ではVS Code startup noiseなし・source mapによるTypeScript行表示・Hostより短いselected test-only実行時間を得られた一方、Host固有oracleを必要とする既存testの境界を変更せずに維持できるためである。

Decision status: Done
