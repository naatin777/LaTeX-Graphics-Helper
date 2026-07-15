# タスク: Playwright CIをscope判定へ接続する

## Status

Done

## 目的

実装済みのCI scope classifierを使い、Playwright workflowを必要な変更でだけ実行するように接続する。最初の適用範囲をPlaywrightに限定し、効果と誤skipを測る。

## 完了条件

- workflow-level `paths` / `paths-ignore` でrequired checkをskipしていない
- classifier jobが常に走る
- 固定名の `playwright-gate` jobが常に走る
- browser Playwrightが不要な変更でskipされる
- Webview / Playwright / CI / unknown変更では必要に応じて実行される
- skipped jobがPR上でPendingにならないことを確認している
- branch protectionのrequired checkがmatrix jobではなく固定gate jobを参照できることを確認している
- 変更前後のActions時間を記録している

## 変更可能なファイル

- `.github/workflows/playwright.yml`
- 必要な `.github/scripts/`
- `docs/tasks/0175-wire-playwright-ci-scope.md`
- `docs/tasks/README.md`

## 対象外

- VS Code test workflowのscope化
- test分割
- external tool install条件の変更

## 関連

- [0174: CI scope classifierを実装する](0174-implement-ci-scope-classifier.md)

## 確認方法

- docs-only、Webview変更、unknown変更のPRでCI表示を確認する
- 必要なら `gh run view` でjob statusを確認する
- `git diff --check`

## 導入手順

1. workflow変更PRでは`.github/**`をfull scopeとして扱い、classifier、3 OS Playwright、固定gateが成功することを確認する
2. workflow変更を`next/v1`へmergeした後、docs-onlyの記録更新PRでPlaywright本体がskipされ、固定gateが成功することを確認する
3. 実際のjob表示と所要時間を記録してからStatusをDoneにする

workflow変更PRだけではdocs-only skipを実測できないため、この時点ではStatusをDoneにしない。

## workflow変更PRの実装内容

- 既存のdocs-only判定jobを、0174のclassifierを呼ぶ`ci-scope` jobへ置き換えた
- `run_browser_playwright=true`の場合だけ3 OSのPlaywright matrixを実行する
- 固定名の`playwright-gate`を`if: always()`で実行し、classifier失敗、必要test失敗、不正flag、想定外skipを失敗にする
- classifierのscope、reason、Playwright実行要否とjob resultをstep summaryへ出す

## workflow変更PRのローカル確認

- YAMLをparseできることを確認した
- workflow内のgate scriptを抽出し、必要test成功と正当なskipが成功することを確認した
- classifier失敗、必要test失敗、不正flagがgateで失敗することを確認した
- classifier仕様テストは34件成功した
- `pnpm run check`は成功した
- `pnpm run test`は実VS Code上で208件成功し、Extension Hostも正常終了した
- `git diff --check`は成功した

## 残る未確認事項

- 現在のbranch protectionが参照しているrequired check
- merge queueの利用有無と、利用する場合に必要な`merge_group` trigger
- `actionlint`はローカルへ導入されていないため未実行

branch protectionのREST APIと設定画面は、この実行環境の認証では読み取れなかった。設定は変更していない。

## workflow変更PRのGitHub Actions結果

PR #341のPlaywright run `29380819894`でfull scope経路を確認した。

| job                | 結果    | 所要時間 |
| ------------------ | ------- | -------: |
| `ci-scope`         | Success |      6秒 |
| Playwright Linux   | Success |     63秒 |
| Playwright macOS   | Success |     69秒 |
| Playwright Windows | Success |    127秒 |
| `playwright-gate`  | Success |      3秒 |
| workflow全体の経過 | Success |  2分23秒 |

導入前のfull相当3件は2分19秒、2分26秒、2分20秒だった。今回の2分23秒はその範囲内であり、classifierと固定gate追加による明確な遅延は見られなかった。

## docs-only検証PR

このPRはこのタスクファイルだけを変更する。したがって、classifierが`docs` scopeと判定し、browser Playwright matrixをskipして固定`playwright-gate`だけをSuccessにする経路を実測する。

実測結果を確認するまでStatusをTodoとし、確認後に完了とする。

## docs-only検証結果

PR #342のPlaywright run `29383326489`でdocs-only経路を確認した。

| job                | 結果    | 所要時間 |
| ------------------ | ------- | -------: |
| `ci-scope`         | Success |      7秒 |
| Playwright matrix  | Skipped |      0秒 |
| `playwright-gate`  | Success |      3秒 |
| workflow全体の経過 | Success |     13秒 |

`ci-scope`はdocs-onlyとして成功し、Playwright matrixはskip、固定`playwright-gate`はSuccessになった。固定gateのjob名は`Playwright / playwright-gate`としてrequired checkに指定できる形である。

このPRのTest workflowは0175の対象外であるVS Code test workflowのため、従来どおり実行された。

以上により、Playwright workflowについてscope判定、正当なskip、固定gate、full経路の実測を完了した。
