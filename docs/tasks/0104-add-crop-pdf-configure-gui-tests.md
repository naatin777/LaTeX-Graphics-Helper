# タスク: cropPdf.configure GUIの失敗テストを追加する

## Status

Done

## 目的

`cropPdf.configure` の実装前に、Webview表示、Hostとのmessage連携、出力反映の主要な振る舞いを失敗テストとして固定する。

## 完了条件

- WebviewがHostから `pdfSrc` を受け取りPDFを表示できることをテストする
- Webviewがcrop範囲指定messageをHostへ送ることをテストする
- Hostがcrop範囲指定messageを受けて処理を開始することをテストする
- 全ページcropと特定ページcropのうち、この段階で固定する範囲を明記する
- Safe Mode / Undo / cancellation のうち、この段階で固定する範囲を明記する
- 実装未完了を理由に追加テストが失敗することを確認する

## 変更可能なファイル

- `test/`
- `test/playwright/`
- `webview/apps/crop_pdf/` 配下のテストファイル
- `docs/tasks/0104-add-crop-pdf-configure-gui-tests.md`

## 対象外

- `src/` の実装変更
- Webview実装変更
- 仕様変更
- split / merge GUIのテスト追加

## 関連

- [0103: cropPdf.configure GUIの仕様を決める](0103-design-crop-pdf-configure-gui.md)
- [0005: WebviewのPDF表示テストを先行追加する](0005-add-failing-webview-pdf-rendering-tests.md)
- [0007: WebviewのPDF表示内容検証を強化する](0007-strengthen-webview-pdf-rendering-tests.md)

## 確認方法

- `pnpm run check:test`
- `pnpm run test:playwright`
- 必要なら `CI=true pnpm run test:vscode`

## 固定した範囲

- Webviewがconfigure用の `init` payloadを受け取ってPDFの最初のページを表示すること
- WebviewがApply時に `apply` messageを送ること
- `apply` messageが `cropBox` と `target: { type: "all" }` を含むこと
- Host側の入口として `latex-graphics-helper.cropPdf.configure` commandが登録されること
- 旧 `latex-graphics-helper.cropPdf.manual` commandを登録しないこと

## この段階で固定しない範囲

- 選択ページcropの詳細UI
- Host側で `apply` messageを受けた後の実変換処理
- Safe Mode / Undo / cancellation の実処理
- Webviewの見た目

## 実施内容

- `test/extension.test.ts` に `cropPdf.configure` command登録の失敗テストを追加した
- `test/playwright/webview-pdf-rendering.spec.ts` にconfigure init payloadとapply messageの失敗テストを追加した
- 実装未完了により追加テストが失敗することを確認した
