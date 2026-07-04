# タスク: cropPdf.configure GUIを実装する

## Status

Done

## 目的

追加済みの失敗テストを通す最小範囲で、`latex-graphics-helper.cropPdf.configure` を実装する。

## 完了条件

- `cropPdf.configure` commandが `src/extension.ts` に登録されている
- ExplorerのPDF切り抜きサブメニューからWebviewを開ける
- WebviewでPDFを表示できる
- ユーザーが指定したcrop範囲をHostへ送れる
- Host側でcrop範囲を使ってPDFを出力できる
- 出力反映が既存のSafe Mode / Undo方針から外れていない
- 追加済みテストが成功する

## 変更可能なファイル

- `src/commands/`
- `src/operations/`
- `src/presentation/webview/`
- `webview/apps/crop_pdf/`
- `package.json`
- `package.nls.ja.json`
- `package.nls.json`
- `test/`
- `test/playwright/`
- `docs/tasks/0105-implement-crop-pdf-configure-gui.md`

## 対象外

- split GUI
- merge GUI
- localブランチの大規模リファクタ移植
- crop UIの高度な作り込み
- dependency追加

## 関連

- [0103: cropPdf.configure GUIの仕様を決める](0103-design-crop-pdf-configure-gui.md)
- [0104: cropPdf.configure GUIの失敗テストを追加する](0104-add-crop-pdf-configure-gui-tests.md)

## 確認方法

- `pnpm run check`
- `pnpm run check:test`
- `pnpm run test:playwright`
- `CI=true pnpm run test:vscode`

## 実施内容

- `cropPdf.configure` の `apply` messageをHost側で受け取り、PDF出力処理を開始するようにした
- cropBoxをPDFポイントのbboxとして検証し、対象ページのMediaBox/CropBoxへ反映する処理を追加した
- 作業ファイルを `.latex-graphics-helper/crop-pdf-configure/` 配下に残すようにした
- 出力反映を既存のSafe Mode / Undo処理へ接続した
- Webview起動直後のmessage取りこぼしを避けるため、Webviewから `ready` を送ってからHostが `init` を返す流れにした
- PDF previewはWebview内のPDF.jsでcanvas-only描画する
- PDF.jsの `pdf.worker.mjs` / `cmaps` / `standard_fonts` / `wasm` をWebview配布物へ含める
- Host側で `webview.asWebviewUri(...)` に変換した `workerSrc` / `cMapUrl` / `standardFontDataUrl` / `wasmUrl` を `init` messageでWebviewへ渡す
- `cMapUrl` / `standardFontDataUrl` / `wasmUrl` はPDF.jsが配下ファイルを解決できるよう末尾 `/` 付きにする
- Webview CSPはPDF.jsの補助アセット読み込みを妨げないよう `connect-src` / `font-src` / `img-src` / `worker-src` で `data:` / `blob:` を必要範囲だけ許可する
- crop previewでは `textLayer` / `annotationLayer` を使わない。範囲選択用途なので、テキスト選択・注釈表示よりcanvas-onlyの安定性を優先する
- Host側で `pdftocairo` などを使ってPNG previewを生成する方式にはしない。遅くなるため、画質改善はPDF.js canvasのrender scale / `devicePixelRatio` 対応で行う

## 確認結果

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
- `CI=true pnpm run test -- --grep "configure cropコマンド|PDF自動crop処理|変換結果の反映処理"`
- PR #305 CI
  - `check`
  - `playwright (Linux)`
  - `playwright (macOS)`
  - `playwright (Windows)`
  - `vscode-test (Linux)`
  - `vscode-test (macOS)`
  - `vscode-test (Windows)`
