# タスク: CI scope設計の現状baselineを測定する

## Status

Done

## 目的

変更影響CI scopeを導入する前に、現状のGitHub Actionsでどこに時間がかかっているかを測定し、以後の改善効果を比較できるbaselineを作る。

## 完了条件

- 直近のfull runを最低3件確認している
- 直近のdocs-only runがあれば確認している
- workflow / job / 主要stepごとの時間を記録している
- setup時間とtest時間を分けて概算している
- scope改善で短縮できそうな箇所と、短縮できなさそうな箇所を分けている
- 修正が必要な場合は別タスク化している

## 変更可能なファイル

- `docs/tasks/0172-measure-ci-scope-baseline.md`
- 別タスク化に必要な `docs/tasks/README.md`
- 別タスク化に必要な新規 `docs/tasks/*.md`
- 必要な `docs/research/`

## 対象外

- workflow、script、package scriptの変更
- test分割
- cacheやparallel stepsの導入

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- GitHub Actionsのrun logまたは `gh run view` で測定する
- `git diff --check`

## 測定日

2026-07-15

GitHub Actionsの公開APIから、2026-07-14のPR runを確認した。`gh` はこの環境で認証が使えなかったため、APIの `actions/runs` と `actions/runs/{run_id}/jobs` を使った。

## 測定対象

### full相当

現行のdocs-only判定では重いCIが走っているPRから3件を選んだ。

| PR / branch                                 | 種別              |   Check | Test workflow | Playwright workflow | 備考                                                |
| ------------------------------------------- | ----------------- | ------: | ------------: | ------------------: | --------------------------------------------------- |
| `task/0171-implement-ai-task-routing-skill` | AI skill追加      |    31秒 |       3分26秒 |             2分19秒 | `.agents/**` 変更で現行判定ではfull相当             |
| `task/0158-split-rulesync-rules`            | RuleSync rule分割 |    24秒 |       7分49秒 |             2分26秒 | Test workflowはqueue / runner待ちを含む可能性が高い |
| `task/0169-0170-safe-stop-hook`             | hook実装          | 1分34秒 |       3分07秒 |             2分20秒 | Checkは `pnpm install` が75秒に伸びた               |

### docs-only

docs-only判定で重いjobがskipされたPRから3件を選んだ。

| PR / branch                                   | Check | Test workflow | Playwright workflow | 備考                                      |
| --------------------------------------------- | ----: | ------------: | ------------------: | ----------------------------------------- |
| `task/0161-design-change-based-ci-scope`      |  26秒 |           9秒 |                 9秒 | Test / Playwrightは `changes` jobだけ実行 |
| `task/0160-design-worktree-parallel-workflow` |  30秒 |           9秒 |                13秒 | 同上                                      |
| `task/0159-design-ai-task-routing-skill`      |  34秒 |           9秒 |                12秒 | 同上                                      |

docs-onlyでは、PR全体のCI待ち時間は概ねCheckの30秒前後に収束している。現行のdocs-only skipは十分効いている。

## full相当runのjob時間

| job                        |  0171 |  0158 |  0169 |  平均 |
| -------------------------- | ----: | ----: | ----: | ----: |
| Check / check              |  31秒 |  24秒 |  94秒 |  50秒 |
| Test / vscode-test Linux   |  97秒 | 123秒 | 116秒 | 112秒 |
| Test / vscode-test macOS   | 169秒 | 193秒 | 165秒 | 176秒 |
| Test / vscode-test Windows | 195秒 | 187秒 | 176秒 | 186秒 |
| Playwright / Linux         |  67秒 |  53秒 |  58秒 |  59秒 |
| Playwright / macOS         | 103秒 |  74秒 | 126秒 | 101秒 |
| Playwright / Windows       | 127秒 | 133秒 | 113秒 | 124秒 |

VS Code testはWindowsとmacOSが重い。Playwrightは実testより準備時間の比率が高い。

## 主要stepの概算

### VS Code test

| OS      | Node / pnpm / install準備 | 外部tool準備 | 実test | 見立て                      |
| ------- | ------------------------: | -----------: | -----: | --------------------------- |
| Linux   |                    約18秒 |       約19秒 | 約70秒 | Electron E2Eも同じjobで走る |
| macOS   |                    約48秒 |       約28秒 | 約90秒 | setupと実testの両方が重い   |
| Windows |                    約67秒 |       約17秒 | 約93秒 | Node / pnpm準備が特に重い   |

### Browser Playwright

| OS      | Node / pnpm / browser install準備 | 実test | 見立て                                |
| ------- | --------------------------------: | -----: | ------------------------------------- |
| Linux   |                            約34秒 | 約20秒 | 準備が6割以上                         |
| macOS   |                            約70秒 | 約23秒 | browser installとpnpm installが支配的 |
| Windows |                            約90秒 | 約26秒 | 準備が大半                            |

### Check

通常は24〜31秒程度。`pnpm install --frozen-lockfile` が伸びると1分超になる。実際の `rulesync:check`、`lint`、`typecheck` は合計5秒前後で、依存準備が支配的。

## 短縮できそうな箇所

- `.agents/**`、RuleSync rule、hook policyなど、アプリ機能ではない変更で3 OSのVS Code testとPlaywrightを走らせている
- Browser Playwrightは3 OSとも準備時間が支配的なので、Webview / Playwright関連変更だけに限定すると効果が大きい
- VS Code testはcore / conversionへ分けない限り、外部tool準備と3 OS testを削りにくい
- Electron E2EはLinuxのVS Code test jobに同居しているため、Webview UI確認だけを独立scopeにしづらい

## 短縮しづらい箇所

- docs-onlyはすでに重いjobをskipできており、残るのはCheckの30秒前後
- Checkは依存準備が支配的で、scope判定だけでは大きく短縮しにくい
- conversion / external CLI変更では3 OS確認を残すべきなので、短縮余地は外部tool準備の条件分岐やcacheに限られる
- GitHub Actionsのqueue / runner割当時間はrepository側のworkflow変更だけでは制御できない

## 別タスク化した問題

- [0177: Check workflowとpackage checkの差分を整理する](0177-align-check-workflow-with-package-check.md)

`Check` workflowは `rulesync:check`、`lint`、`typecheck` を個別実行している。一方で `package.json` の `check` は `format` と `typecheck:webview` も含む。意図的な差分か、CI漏れかを別タスクで確認する。

## 実施結果

- 直近のfull相当runを3件確認した
- 直近のdocs-only runを3件確認した
- workflow / job / 主要stepごとの時間を記録した
- setup時間とtest時間を分けて概算した
- scope改善で短縮できそうな箇所と短縮しづらい箇所を分けた
- 見つかったCheck workflow差分を別タスク化した
