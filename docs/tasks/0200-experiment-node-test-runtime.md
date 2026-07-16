# Task: Node test runtimeを小規模検証する

## Status

Done

## Hypothesis

Node-level testをExtension Hostから分離すると、contractを弱めずに実行時間とfailure diagnosisを改善できる。

今回比較するのはruntimeの分離だけであり、MochaからVitestへの変更ではない。既存Mocha、Node assert、Sinon等を維持する。

## Scope

### Selected tests

- `test/source_format.test.ts`
- `test/crop_pdf_protocol.test.ts`
- `test/resolve_output_path.test.ts`
- `test/file_content_hash.test.ts`
- `test/safe_mode.test.ts`

### Comparison

- Baseline: VS Code Extension Host + Mocha (`test:vscode`と同じcompile経路)
- Experiment: plain Node + Mocha

### Allowed change

- 実験専用のpackage scriptと小さいcompile/config差分
- runner-neutralなtest-only修正が必要な場合の最小変更
- このtask、0198、task index、project stateの同期

### Out of scope

- Vitestの追加・使用・正式採用
- production boundary、production behavior、public commandの変更
- testの複製・移動、assertion削除・弱体化、platform caseの除外
- Browser Playwright、Electron Playwright、fixture、screenshot、CI workflow、依存、lockfileの変更
- Oxlint/Oxfmtの再設計、formal spec、Skill、README機能説明の変更

## Baseline

- 現行script: `test:vscode` → `build:test` → `vscode-test`
- Host runtime: VS Code Extension Host + Mocha via `@vscode/test-cli`, fixed VS Code `1.128.0`
- file/case数: root Mocha 45 files / 207 statically declared cases。現行全suiteの実行結果は211 passing。selected scopeは5 files / 18 cases / 31 assertion expressions。
- cold timing: full Host `test:vscode` 53.37s。VS Code `1.128.0` Darwin arm64 package 272.45MBをこのrunでdownloadした。
- warm timing: full Host `test:vscode` 26.44s / 26.71s / 28.83s（median 26.71s）。selected scopeは既存compile後の`vscode-test --run`で18 casesを実行した。
- diagnostics: assertion diffは表示されるが、Extension Host起動ログ・AccountPolicy・VS Code warningがあり、意図的failureのstackはcompiled `out/test` pathになった。

## Experiment

- Node script: `test:node:experiment`（`build:test:node:experiment`後にplain NodeでMochaを明示的な5 JS fileへ実行）
- compile方法: 既存の`compile`と`compile:test`を使用。`tsconfig.test.json`のsource mapを維持し、Webview compileは行わない。追加configなし。
- file/case数: baselineと同じ5 test source files / 18 cases / 31 assertion expressions。test sourceの複製・移動・変更はない。
- timing: selected scopeのbuild+testは2.89s / 2.83s / 2.85s（median 2.85s）。test-onlyは0.11s / 0.10s / 0.09s（median 0.10s）。
- diagnostics: `node --enable-source-maps`により、意図的failureは元のTypeScript file/lineへ解決された。VS Code startup noiseはない。

## Dependency findings

| Test                          | Direct dependency                                                                                       | Transitive dependency                                 | Node status                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `source_format.test.ts`       | test: `node:assert/strict`; source: `node:path`                                                         | `vscode`: none                                        | Ready                                     |
| `crop_pdf_protocol.test.ts`   | test: `node:assert/strict`; source: none                                                                | `vscode`: none                                        | Ready                                     |
| `resolve_output_path.test.ts` | test: `node:assert/strict`, `node:path`; source: `node:path`, `process.platform`                        | `vscode`: none                                        | Ready; win32/posix is explicitly injected |
| `file_content_hash.test.ts`   | test/source: `node:assert/strict`, `node:crypto`, `node:fs`, `node:fs/promises`, `node:os`, `node:path` | `vscode`: none; no fixture/helper                     | Ready                                     |
| `safe_mode.test.ts`           | test: `node:assert/strict`; source: none at runtime                                                     | `vscode`: none; `MemoryState` is a local test adapter | Ready                                     |

## Correctness comparison

| Test                          | Host    | Node    | Same cases | Same assertions | Notes                                                            |
| ----------------------------- | ------- | ------- | ---------- | --------------- | ---------------------------------------------------------------- |
| `source_format.test.ts`       | 1 pass  | 1 pass  | Yes        | Yes, 6          | no skip                                                          |
| `crop_pdf_protocol.test.ts`   | 2 pass  | 2 pass  | Yes        | Yes, 3          | malformed apply and preview error both run                       |
| `resolve_output_path.test.ts` | 12 pass | 12 pass | Yes        | Yes, 12         | win32 and posix platform cases both run                          |
| `file_content_hash.test.ts`   | 1 pass  | 1 pass  | Yes        | Yes, 4          | real temporary files and streaming hash                          |
| `safe_mode.test.ts`           | 2 pass  | 2 pass  | Yes        | Yes, 6          | local `MemoryState` adapter; no actual VS Code globalState claim |

Total: Host 18 passing / 0 failing / 0 skipped。Node 18 passing / 0 failing / 0 skipped。platform-specific test case、assertion、failure conditionの削除はない。

## Timing

| Mode                       | Run 1 | Run 2 | Run 3 | Median | Notes                                                        |
| -------------------------- | ----: | ----: | ----: | -----: | ------------------------------------------------------------ |
| Host build + selected test | 5.79s | 5.83s | 5.88s |  5.83s | `build:test` + Host `--run`; VS Code download cache: present |
| Host test only, selected   | 3.13s | 2.70s | 2.54s |  2.70s | existing compiled JS + Extension Host startup                |
| Node build + selected test | 2.89s | 2.83s | 2.85s |  2.85s | `test:node:experiment`; Webview compile excluded by design   |
| Node test only, selected   | 0.11s | 0.10s | 0.09s |  0.10s | compiled JS + plain Node + Mocha                             |

Full Host `test:vscode` warm: 26.44s / 26.71s / 28.83s（median 26.71s、211 passing）。cold 53.37sはVS Code download込み。Build+test差はruntimeだけでなく、Node実験がWebview compileと全Host suiteを含めない点も含むため、test-onlyを主比較とする。

## Failure diagnostics

意図的なfailureは一時変更として実行し、commit前に元へ戻す。

| Criterion                 | Host                                                                               | Node                                                    |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ---- |
| failure message           | `AssertionError [ERR_ASSERTION]`、17 passing / 1 failing                           | 同じ                                                    | 同等 |
| expected / actual         | 同じdiff（actual `editable-drawio-svg` / expected `pdf`）                          | 同じdiff                                                | 同等 |
| test fileと行番号         | `out/test/source_format.test.js:6:16`                                              | `test/source_format.test.ts:13:12`                      | Node |
| stack trace / source map  | compiled JS path。source map fileは生成されるがHost出力はTSへ逆引きしない          | TS sourceへ逆引き。Mocha内部stackのみ                   | Node |
| cleanup後の状態           | selected testsのtemp artifactはclean。VS Code user-dataはrunner管理のignored state | selected testsのtemp artifactはclean。VS Code stateなし | Node |
| runner固有noise           | VS Code startup、AccountPolicy、cached-data warning、Extension Host終了ログ        | なし                                                    | Node |
| failure原因の特定しやすさ | assertion差分は明確だが環境noiseとcompiled pathが残る                              | assertion差分、TS line、短いstackが直接出る             | Node |

Failure injectionは`source_format.test.ts`の期待値を一時的に`pdf`へ変更して実行し、比較後に`editable-drawio-svg`へ復元した。意図的failureはcommitに残していない。

## Findings

### Observation

- 同じ5つのtest sourceをHostとNodeで実行でき、18 cases / 31 assertion expressionsを両方でpassさせられた。
- selected test-onlyの中央値はHost 2.70s、Node 0.10sだった。Hostの差分の中心はExtension Host起動である。
- Node build+testはHost selected build+testより短かったが、Node側はWebview compileを含めず、Host側は`build:test`を使った。
- 選定5件のdirect / transitive graphに`vscode`、fixture、test helper、cwd依存、extension activation、global initializationはなかった。
- local実行環境はmacOS Darwin arm64のみ。Windows/Linuxは実行していない。

### Interpretation

- この5件については、同じcontractとassertionを保ったままNode runtimeへ分離できるという仮説を支持する。
- local developer feedbackとfailure diagnosisには明確な価値がある。特にsource-map付きのTS lineとHost起動noiseの除去は観測できた改善である。
- `safe_mode.test.ts`が証明するのはstate adapter contractであり、actual VS Code `globalState`やstatus barは引き続きHost Evidenceである。

### Unknown

- Windows/LinuxでのNode Mocha結果、実filesystem/permission差、Node startup差
- P0候補全体へ拡張したときのhidden dependencyとfailure diagnosis
- 3 OS CIへ一時接続するcost、required statusにする価値、branch protectionとの関係
- permanent directory structure、正式script名、Node MochaとNode Vitestの比較

### Contradiction

- 選定5件について、foundation inventoryが示したP0仮説と実測結果に矛盾はなかった。rootの207 statically declared casesとfull Hostの211 passingは、静的列挙と動的実行数の違いであり、同じ数として扱わない。

## Selection Gate

- Node experimentを3 OS CIへ一時接続する価値があるか: 次のSelection Gateとして残す。今回のmacOS結果は接続を検討する根拠になるが、3 OS Evidenceではない。
- Node runtimeをtested subsetへ採用するか: maintainer判断。今回の5件では採用候補を支持するEvidenceが得られた。
- Node MochaとNode Vitestを別taskで比較するか: 別task。今回Vitestは使用していない。
- current Host runnerをどの範囲で維持するか: activation、command、configuration、provider、actual VS Code state/UIはHostに残す前提で別判断する。
- production boundary workが必要か: 選定5件では不要。P2候補のNode化へ一般化しない。

## Recommendation

今回の結果は **Successful experiment**。tested subsetについては、同じsource・case・assertionを維持でき、local feedbackとfailure diagnosisに明確な価値があるため、Node runtimeの3 OS一時CI実験を次taskのSelection Gateとして推奨する。ただし、Node runtimeの正式採用、全test移行、Vitest比較、directory変更は確定しない。

## Verification

| Command                           | Result   | Notes                                                                   |
| --------------------------------- | -------- | ----------------------------------------------------------------------- |
| `git status --short`              | pass     | final working tree contains only scoped files; no test source change    |
| `git diff --check`                | pass     | no whitespace errors                                                    |
| `pnpm install --frozen-lockfile`  | pass     | lockfile unchanged; pnpm 11.8.0                                         |
| `pnpm run check:all`              | pass     | existing oxlint warnings only; format, TS, NLS passed                   |
| `pnpm run test:vscode`            | pass     | full Host suite; 211 passing; final warm timed run 22.58s               |
| `pnpm run test:node:experiment`   | pass     | 3 repeated runs; 18 passing each; 2.89s / 2.83s / 2.85s                 |
| selected Host `vscode-test --run` | pass     | 3 repeated runs; 18 passing each                                        |
| intentional failure comparison    | pass     | Host/Node both failed one same assertion; source restored before commit |
| local platform                    | recorded | macOS Darwin arm64, Node v26.5.0; Windows/Linux not run                 |
