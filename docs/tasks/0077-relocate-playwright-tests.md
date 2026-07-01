# タスク: Playwrightテストをsrc配下から移動する

## Status

Done

## 目的

`src/test/playwright/` にあるPlaywrightテストは、実装ソース配下にE2Eテストが混ざって見えるため、テスト用ディレクトリへ移動する。

## 完了条件

- `src/test/playwright/webview-pdf-rendering.spec.ts` を `test/playwright/webview-pdf-rendering.spec.ts` へ移動する
- `playwright.config.mjs` の `testDir` を移動先に合わせる
- テスト内容・期待値は変更しない
- Playwrightテストが実行できる

## 変更可能なファイル

- `playwright.config.mjs`
- `src/test/playwright/webview-pdf-rendering.spec.ts`
- `test/playwright/webview-pdf-rendering.spec.ts`
- `docs/tasks/README.md`
- `docs/tasks/0077-relocate-playwright-tests.md`

## 対象外

- Playwrightテスト内容の改善
- Webview実装変更
- テスト名や期待値の変更

## 確認方法

- `CI=true pnpm run test:playwright`
- `CI=true pnpm run check`
