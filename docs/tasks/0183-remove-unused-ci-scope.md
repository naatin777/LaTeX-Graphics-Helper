# タスク: 未接続のCI scope classifierを削除する

## Status

Done

## 目的

現在Playwright workflowで実際に必要なdocs-only判定だけを残し、まだworkflowへ接続されていないconversion・extension-core・Electron E2E向けのCI scope classifierを削除する。
既存の`detect-docs-only.sh`をPlaywrightとVS Code testで共有し、CIの判定経路を1つにする。

## 完了条件

- `.github/scripts/ci-scope/`と`detect-ci-scope.mjs`を削除する
- classifier専用テストとcontract helperを削除する
- Playwright workflowが`detect-docs-only.sh`を使う
- Playwrightの固定gateを維持し、docs-only時のskipをSuccessとして扱う
- Test workflowとPlaywright workflowのdocs-only判定が同じscriptになる
- `ci-scope`またはclassifierの実行時参照が残らない
- `pnpm run check:all`が成功する

## 変更可能なファイル

- `.github/workflows/playwright.yml`
- `.github/scripts/ci-scope/**`
- `.github/scripts/detect-ci-scope.mjs`
- `test/ci_scope_classifier.test.ts`
- `test/ci_scope_classifier_boundary.test.ts`
- `test/helpers/ci_scope_classifier_contract.ts`
- `docs/tasks/0183-remove-unused-ci-scope.md`
- `docs/tasks/README.md`

## 対象外

- `.github/scripts/detect-docs-only.sh`の仕様変更
- Test workflowのdocs-only判定変更
- VS Code testのcore / conversion分割
- 新しいCI scope classifierの設計
- CI jobそのものの削除

## 確認方法

- `pnpm run check:all`
- `pnpm run test:vscode`
- 削除対象への実行時参照を検索する
- `git diff --check`
