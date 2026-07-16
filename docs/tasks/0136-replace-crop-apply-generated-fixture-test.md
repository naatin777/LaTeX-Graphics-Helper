# タスク: crop Applyの動的fixtureテストを固定fixtureへ置き換える

## Status

Done

## 目的

`cropPdf.configure`の全ページApplyテストを、テスト中に生成する単純PDFから提供済み固定fixtureへ置き換える。

## Test Addition Phase

実装コードは変更せず、既存テストの入力方式だけを置き換える。

## 完了条件

- 全ページApplyテストが提供済み固定fixtureを読み込む
- 既存の`cropBox`と全ページtargetの検証を維持する
- 同じ目的の動的生成PDF版テストを残さない
- 座標制御を目的とするズーム用の小さな生成PDFは残す

## 変更可能なファイル

- `test/playwright/webview-pdf-rendering.spec.ts`
- `test/helpers/crop_configure_fixture.ts`
- `docs/tasks/README.md`
- `docs/tasks/0136-replace-crop-apply-generated-fixture-test.md`

## 対象外

- Webview実装の変更
- 他機能のfixture置換
- fixtureファイルの内容変更
- Playwright runnerやCIの変更

## 関連

- [テスト方針](../specs/internal/test-policy.md)
- [0135: 固定fixtureによる既存テスト置換方針を明記する](0135-clarify-fixed-fixture-test-replacement-policy.md)

## 確認方法

- `CI=true pnpm run test:playwright -- -g "固定fixture"`
- `git diff --check`
