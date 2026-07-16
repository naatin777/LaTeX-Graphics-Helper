# Task: Node testを3 OS CIで検証する

## Status

In Progress

Remote GitHub Actions Evidence待ち。

## Hypothesis

task 0200でNode-readyと判定された同一の5 test sources / 18 cases / 31 assertion expressionsは、Linux・macOS・Windowsのplain Node + Mochaでもcontractを弱めずにpassし、VS Codeや外部CLIを起動しない小さいCI Evidenceとして分離できる。

## Scope

### Included

- Linux、macOS、Windows
- plain Node + Mocha
- task 0200と同じ5 test sources / 18 cases / 31 assertion expressions / 0 skipped
- 既存の`build:test:node:experiment`、`test:node:experiment`
- 独立したGitHub Actions jobのduration、failure owner、cache差の観測

### Excluded

- Node runtime正式採用
- Vitest比較・採用
- test移動、複製、assertion変更、Hostからのtest除外
- branch protection / ruleset変更、required status化
- production変更、Browser/Electron変更、release workflow変更
- external tool、VS Code、Xvfb、Playwright、packaged VSIXのsetup

## Baseline from 0200

- Selected tests:
  - `test/source_format.test.ts`
  - `test/crop_pdf_protocol.test.ts`
  - `test/resolve_output_path.test.ts`
  - `test/file_content_hash.test.ts`
  - `test/safe_mode.test.ts`
- Scope: 5 files / 18 cases / 31 assertion expressions / 0 skipped
- Local result: macOS Darwin arm64のplain Node + Mochaで18 cases pass
- Local timing: Node test-only median約0.10秒、Host selected test-only median約2.70秒
- Diagnostics: Node source mapで元のTypeScript行を表示。HostはExtension Host起動noiseとcompiled pathを含む
- Source/production: test sourceの変更・複製なし、production code変更なし、dependency/lockfile変更なし
- Vitest: 未使用

## CI design

| Item               | Decision                                                                           | Reason                                                          |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Workflow           | `.github/workflows/test.yml`へ追加                                                 | 既存Test workflowと同じPR/main pushのEvidenceに接続する         |
| Job isolation      | `vscode-test`とは独立した`node-test-experiment` job                                | Host起動、外部tool、Node failureのownerを分離する               |
| OS matrix          | `ubuntu-latest`、`macos-latest`、`windows-latest`                                  | 3 OSの結果を独立して確認する                                    |
| docs-only behavior | `changes` jobの`docs_only` outputを再利用し、`!= 'true'`で実行                     | docs-only変更ではNode experimentをskipする既存意味を維持する    |
| Action/runtime     | checkout v7、pnpm/action-setup v6、pnpm 11.8.0、setup-node v6、Node 22、pnpm cache | 既存workflowの設定へ合わせる                                    |
| Command            | `pnpm run test:node:experiment`                                                    | 既存のplain Node + Mocha experiment scriptをそのまま使う        |
| External tools     | インストールしない                                                                 | Node-only subsetの独立性と小さいCI costを確認する               |
| Failure policy     | `continue-on-error`、retry、failureを成功扱いするwrapperなし                       | OS failureをEvidenceとして保持する                              |
| Required status    | 今回は決めない                                                                     | job追加とbranch protection/rulesetのrequired status化を分離する |

今回のworkflow変更はdocs-only判定をfalseにするため、PRでNode jobの起動条件を確認できる。ただしremote runの結果はpush前には得られない。

## Local verification

| Command                                                                                                           | Result | Notes                                            |
| ----------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------ |
| `git status --short`                                                                                              | Pass   | 変更対象4ファイルを確認                          |
| `git diff --check`                                                                                                | Pass   | whitespace errorなし                             |
| `pnpm install --frozen-lockfile`                                                                                  | Pass   | lockfileは変更しない                             |
| `pnpm run check:nls`                                                                                              | Pass   | NLS consistency OK                               |
| `pnpm run check:all`                                                                                              | Pass   | 既存lint warningのみ、format/typecheck/NLSは成功 |
| `pnpm run test:node:experiment`                                                                                   | Pass   | 18 passing、0 skipped                            |
| `pnpm run test:vscode`                                                                                            | Pass   | 211 passing、selected scopeは18 cases            |
| `pnpm exec oxfmt --check PROJECT_STATE.md docs/tasks/README.md docs/tasks/0201-experiment-node-test-ci-matrix.md` | Pass   | changed Markdown                                 |

## Remote Evidence

| OS      | Workflow result | Cases | Skipped | Duration | Node version | Notes                     |
| ------- | --------------- | ----: | ------: | -------: | ------------ | ------------------------- |
| Linux   | Pending         |       |         |          |              | branch push前のため未取得 |
| macOS   | Pending         |       |         |          |              | branch push前のため未取得 |
| Windows | Pending         |       |         |          |              | branch push前のため未取得 |

## Observations

Remote run前に3 OSのpass/fail、case数、skip数、durationを断定しない。

## Unknowns

- Linux・macOS・Windowsのremote correctness結果
- GitHub Actions job durationとpnpm cache impact
- Windows filesystem behavior
- failure ownerが各OSでNode job単独として診断できるか
- required status policy、branch protection/rulesetの扱い
- Node runtime正式採用、P0 expansion、Mocha / Vitest comparison

## Selection Gate

- experimental CI jobをkeepまたはremoveするか
- tested subsetへNode runtimeを採用するか
- experimental scriptをrenameするか
- Node subsetを拡張するか
- MochaとVitestを比較するか
- selected testsをHostにも一時的に残す方針を続けるか
- required statusを別途決めるか

CI成功だけでNode runtime正式採用とはしない。jobは通常のGitHub Actions checkとして実行し、required status化は今回決めない。

## Completion conditions

- PR上で3 OS jobが実行される
- 各OSのpass/fail、case数、skip数を確認する
- job durationを記録する
- failureを隠していない
- taskへremote Evidenceを記録する
- maintainer向けrecommendationを記録する
