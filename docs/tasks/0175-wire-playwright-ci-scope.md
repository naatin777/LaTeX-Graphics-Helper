# タスク: Playwright CIをscope判定へ接続する

## Status

Todo

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

## workflow変更PRで未確認の項目

- GitHub Actions上のfull scope実行結果と所要時間
- merge後のdocs-only PRにおけるPlaywright matrixのskipと固定gateの成功
- 現在のbranch protectionが参照しているrequired check
- merge queueの利用有無と、利用する場合に必要な`merge_group` trigger
- `actionlint`はローカルへ導入されていないため未実行

branch protectionのREST APIと設定画面は、この実行環境の認証では読み取れなかった。設定は変更していない。
