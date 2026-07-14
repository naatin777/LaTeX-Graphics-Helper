# タスク: 変更影響に応じたCI scopeを設計する

## Status

Done

## 目的

変更内容に関係するtestとOSだけを実行し、必要な確認をskipせずGitHub Actionsの準備・実行時間を減らす設計を決める。

## 決めること

- docs、Webview、core extension、外部CLI変換、CI・dependency変更の分類
- 各分類で必要なcheck、vscode-test、browser Playwright、Electron E2E、対象OS
- 未知のfileや複数分類を安全側で全実行にする方法
- VS Code testをcore / conversionへ分ける必要性
- path判定、test選択、workflow条件の責務
- 現在時間と変更後時間の測定方法

## 完了条件

- 変更分類と実行するCIの対応表がある
- required checkをPendingにしない構成を決めている
- 外部toolを必要なjobだけで準備する設計になっている
- 誤ったskipを検出・回避する条件がある
- 実装を小さな実測タスクへ分けている
- workflow、script、testをこのタスクで変更していない

## 変更可能なファイル

- `docs/tasks/0161-design-change-based-ci-scope.md`
- `docs/tasks/README.md`
- 必要な`docs/adr/`
- 必要な`docs/research/`

## 対象外

- GitHub Actions、script、package scriptの変更
- test fileの分割
- parallel stepsとshardの再導入
- dependency追加

## 関連

- [ADR-0014: AI開発ハーネスの責務と導入順を定義する](../adr/0014-define-ai-development-harness.md)
- [0151: CI環境変数のローカル・CI運用を整理する](0151-document-ci-env-policy.md)

## 確認方法

- 現在のworkflowとtest構成を対応表へ当てはめる
- 未知の変更、複数分類、docs-onlyの例で判定を確認する
- `git diff --check`

## 現在のCI構成

- `Check`
  - `pnpm run rulesync:check`
  - `pnpm run lint`
  - `pnpm run typecheck`
  - 変更内容に関係なく常に実行する
- `Test`
  - 先頭の `changes` job が docs-only を判定する
  - docs-only 以外では Linux / macOS / Windows の `pnpm run test` を実行する
  - Linuxだけ `pnpm run test:playwright:electron` も実行する
  - 各OSで外部画像・PDF toolを準備している
- `Playwright`
  - 先頭の `changes` job が docs-only を判定する
  - docs-only 以外では Linux / macOS / Windows の `pnpm run test:playwright` を実行する

現在は docs-only とそれ以外の2段階に近い。次の改善では、workflowをskipするのではなく、常時起動する軽量classifier jobの出力で後続jobをjob-level `if` により制御する。

## 設計判断

### workflow-level path filterは使わない

GitHub Actionsのworkflow-level `paths` / `paths-ignore` は、workflow自体を起動しない。required checkに設定しているworkflowがこの理由でskipされると、checkがPendingのままになりPR mergeを止める可能性がある。

このprojectでは次の方針にする。

- workflowは原則として `pull_request` で常に起動する
- 先頭に軽量な `ci-scope` jobを置く
- 重いjobは `needs: ci-scope` と `jobs.<job_id>.if` で実行可否を決める
- skipped jobはSuccess扱いになるため、required checkをPendingにしない
- 判定不能、未知のfile、diff取得失敗、分類表にないfileはfull scopeへ倒す

### 判定責務

path判定はworkflow YAMLへ分散させず、1つのscriptに寄せる。

候補:

- `.github/scripts/detect-ci-scope.mjs`

責務:

- base/headから変更file一覧を取得する
- file pathをscopeへ分類する
- 複数scopeの場合は和集合を返す
- 不明なfileがある場合は `full=true` を返す
- 生成したscopeをGitHub Actions outputへ出す
- 判定結果をlogに出し、なぜそのjobが走るかを読めるようにする

workflowの責務:

- classifier outputを読む
- job-level `if` でjobをskipする
- 必要なjobだけで外部toolをinstallする
- 最終summary jobで「何を走らせ、何をskipしたか」を出す

### VS Code testはcore / conversionへ分ける

現在の `pnpm run test` は1回起動すると外部CLI変換系もVS Code integrationも同じrunに入る。そのため、変更影響だけで外部tool setupを省くには、将来的に次の2系統へ分ける必要がある。

- `test:vscode:core`
  - command registration
  - settings
  - globalState
  - notification helper
  - Safe Mode / Undoのうち外部CLI不要な部分
  - LaTeX挿入
  - manifestやpackage関連
- `test:vscode:conversion`
  - PDF / image / Mermaid / Draw.io変換
  - crop / split / merge
  - outputPath
  - 外部CLI、path互換性、ASCII staging

この分割は既存testの移動を伴うため、このタスクでは実装しない。

## CI scope対応表

| 変更分類                  | 例                                                                                                                                                    | Check | VS Code core | VS Code conversion | Browser Playwright | Electron E2E  | OS                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------ | ------------------ | ------------------ | ------------- | ------------------------------------- |
| docs-only                 | `docs/**`, `README*.md`, `CHANGELOG.md`                                                                                                               | 必須  | skip         | skip               | skip               | skip          | ubuntuのみ                            |
| AI/rules                  | `.agents/**`, `.rulesync/**`, `AGENTS.md`, `.codex/**`                                                                                                | 必須  | 原則skip     | skip               | skip               | skip          | ubuntuのみ                            |
| package / lockfile        | `package.json`, `pnpm-lock.yaml`, `.npmrc`                                                                                                            | 必須  | 必須         | 必須               | 必須               | 必須          | 3 OS                                  |
| CI / scripts              | `.github/**`, `scripts/**`, `.vscode-test.mjs`, `playwright.config.*`                                                                                 | 必須  | 必須         | 必須               | 必須               | 必須          | 3 OS                                  |
| extension core            | `src/extension.ts`, command登録、設定、状態管理                                                                                                       | 必須  | 必須         | 原則skip           | skip               | 必要ならLinux | Linux優先                             |
| conversion / external CLI | `src/**/convert*`, `src/**/crop*`, `src/**/split*`, `src/**/merge*`, `src/**/drawio*`, `src/**/mermaid*`, `src/**/outputPath*`, external tool wrapper | 必須  | 必須         | 必須               | 関連時のみ         | 関連時のみ    | 3 OS                                  |
| Webview host              | Webview panel生成、message contract、CSP、PDF.js asset path                                                                                           | 必須  | 必須         | 関連時のみ         | 必須               | 必須          | Linux Electron + 必要なら3 OS browser |
| Webview UI/CSS            | `webview/**`, crop configure UI/CSS                                                                                                                   | 必須  | 原則skip     | skip               | 移行期間のみ       | 必須          | Linux Electron                        |
| test-only: vscode         | `test/**/*.test.ts` のVS Code integration                                                                                                             | 必須  | 対象test     | 対象test           | skip               | 関連時のみ    | test内容に従う                        |
| test-only: playwright     | `test/playwright/**`                                                                                                                                  | 必須  | skip         | skip               | 対象project        | 対象project   | projectに従う                         |
| fixture                   | `test/fixtures/**`                                                                                                                                    | 必須  | 関連時のみ   | 関連時のみ         | 関連時のみ         | 関連時のみ    | 利用testに従う                        |
| unknown                   | 分類表にないfile                                                                                                                                      | 必須  | 必須         | 必須               | 必須               | 必須          | 3 OS                                  |

初期実装では、docs-only以外で複数の非docs分類にまたがる場合はfull scopeにする。scope判定が安定し、core / conversion / Webviewの境界がtest command上でも分離できてから、必要scopeの和集合へ緩める。

`package / lockfile`、`CI / scripts`、`unknown` を含む場合は常にfull scopeにする。

## required checkとgate job

GitHub branch protectionのrequired checkには、matrix job名を直接指定しない方針にする。

理由:

- matrix job名はOSやprojectごとに増え、scope skip時の見え方が複雑になる
- job-level skipはSuccess扱いになるが、どのjobをskipしてよかったかの説明がPR上で見えにくい
- required checkを固定名のgate jobへ寄せると、scope判定と失敗判定を集約できる

各workflowに次のような固定名jobを置く。

- `Check / check`
- `Test / test-gate`
- `Playwright / playwright-gate`

gate jobの責務:

- `if: always()` 相当で常に実行する
- classifier結果をsummaryへ出す
- scope上実行対象だったjobが失敗・cancelledなら失敗する
- scope上skip対象だったjobは成功扱いにする
- docs-onlyでも「対象外としてskipした」ことをsummaryに出して成功する

実装時はGitHub上のrequired check設定を確認し、matrix jobをrequiredのまま残さない。

## skip誤りを避ける条件

- classifier scriptのunit testを作る
- docs-only、unknown、複数非docs scope、package変更、Webview変更、conversion変更のfixture file listを用意する
- classifierが不明fileを検出したらfull scopeにする
- classifierが空の変更file listを受け取った場合もfull scopeにする
- 初期実装では複数の非docs scopeをfull scopeにする
- PRではGitHubのthree-dot diff相当、pushではtwo-dot diff相当を明示的に扱う
- diff取得に失敗したらfull scopeにする
- workflow-level `paths-ignore` をrequired checkの代替にしない

## 外部tool準備の方針

外部tool installはjobの先頭で常に行わず、conversion scopeを実行するjobだけに寄せる。

- `test:vscode:core` jobではPoppler、Ghostscript、qpdf、Draw.io、rsvg-convert、Mermaid CLI browser setupを準備しない
- `test:vscode:conversion` jobでは対象OSごとに必要toolを準備する
- Electron E2EはWebview UI確認を主目的とし、GUI crop configureのようにpdf-libだけで完結する経路では外部pdfcropを要求しない
- Quick cropなど外部CLI実行を確認するE2Eは別scopeにする

## 測定方法

各改善PRで次をPR本文またはtask実施結果へ記録する。

- 対象PR番号
- 変更file分類
- 実行されたworkflow / job
- skipされたworkflow / job
- 各jobの総時間
- setup時間とtest時間の概算
- 変更前の近いPRとの差分

初回は直近のfull runとdocs-only runからbaselineを取る。大きく揺れるため、1回だけで結論を出さず、最低3回分を見てから次の削減を判断する。

## 後続タスク

- [0172: CI scope設計の現状baselineを測定する](0172-measure-ci-scope-baseline.md)
- [0173: CI scope classifierの仕様テストを追加する](0173-add-ci-scope-classifier-tests.md)
- [0174: CI scope classifierを実装する](0174-implement-ci-scope-classifier.md)
- [0175: Playwright CIをscope判定へ接続する](0175-wire-playwright-ci-scope.md)
- [0176: VS Code testのcore / conversion分割を設計する](0176-design-vscode-test-core-conversion-split.md)

## リスクと未確認事項

- GitHub上の実際のrequired check設定は未確認。実装時にgate jobへ移行できるか確認する必要がある
- 現在の `.github/workflows/check.yml` は `pnpm run check` そのものではなく、`rulesync:check`、`lint`、`typecheck` を個別実行している。`package.json` の `check` との差分は別途確認する
- VS Code testのcore / conversion境界はまだない。単純なgrep分割ではcoverage漏れやfixture依存を起こす可能性がある
- rename、削除、初回push、改行を含むfile nameへのclassifier耐性は実装タスクで確認する
- `.github/workflows/external-tool-path-probe.yml` がある場合は、scope判定と外部tool準備方針との整合を確認する

## 実施結果

- 現在の `Check` / `Test` / `Playwright` workflowを確認した
- GitHub Actions公式documentを確認し、workflow-level path skipではなくjob-level `if` を使う方針にした
- 変更分類とCI実行scopeの対応表を作成した
- required checkを固定gate jobへ寄せる方針を決めた
- 外部tool準備をconversion scopeへ寄せる方針を決めた
- 実装を小さな後続タスクへ分割した
- このタスクではworkflow、script、testは変更していない
