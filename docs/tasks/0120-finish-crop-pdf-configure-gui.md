# タスク: cropPdf.configure GUIを実操作できる状態へ仕上げる

## Status

Done

## 目的

`cropPdf.configure` のWebviewを、サンプル的なApply画面ではなく、ユーザーがPDFを見ながらcrop範囲と対象ページを指定できるGUIへ仕上げる。

## 完了条件

- Webview上でPDFページが実VS Code環境でも表示される
- PDF表示に失敗した場合、空白ではなくエラー状態が分かる
- crop範囲をユーザーがGUI上で指定できる
- 全ページ適用と選択ページ適用をGUI上で切り替えられる
- 選択ページ適用の場合、対象ページを指定できる
- Apply時にGUIで指定したcropBoxとtargetがHostへ送られる
- 主要な挙動をPlaywrightまたはVS Code integration testで確認する

## 変更可能なファイル

- `webview/apps/crop_pdf/`
- `webview/shared/`
- `src/commands/crop_pdf_configure.ts`
- `src/presentation/webview/`
- `test/`
- `test/playwright/`
- `docs/specs/internal/crop-pdf-configure.md`
- `docs/tasks/0120-finish-crop-pdf-configure-gui.md`

## 対象外

- 複数PDFの同時configure crop
- ページごとに異なるcrop範囲
- crop範囲の自動検出
- split / merge GUI
- 大規模なWebview構成変更

## 関連

- [0103: cropPdf.configure GUIの仕様を決める](0103-design-crop-pdf-configure-gui.md)
- [0104: cropPdf.configure GUIの失敗テストを追加する](0104-add-crop-pdf-configure-gui-tests.md)
- [0105: cropPdf.configure GUIを実装する](0105-implement-crop-pdf-configure-gui.md)
- [PDF configure crop仕様](../specs/internal/crop-pdf-configure.md)

## 確認方法

- `pnpm run check`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
- `CI=true pnpm run test -- --grep "configure cropコマンド|Webview HTML生成"`

## 実施内容

- PDF.js canvas描画を `devicePixelRatio` 対応にし、表示サイズを変えずにcanvas内部解像度だけ上げた
- crop範囲をPDFポイント単位の数値入力で指定できるようにした
- 対象ページを `All pages` / `Selected pages` で切り替えられるようにした
- `Selected pages` ではカンマまたは空白区切りでページ番号を入力できるようにした
- Apply時にWebviewからHostへ、ユーザーが入力した `cropBox` と `target` を送るようにした
- PDF読み込み後の初期cropBox補完が、ユーザー入力済みの値を上書きしないようにした

## UI方針

- 初期GUIではドラッグ範囲選択ではなく、数値入力を正本にする
- 理由は、PDFポイント座標との対応が明確で、Host側の検証・Playwrightテストと揃えやすいため
- ドラッグ範囲選択は、必要になった時点で別タスク化する
- PNG preview生成は使わない。画質改善はPDF.js canvasのrender scale / `devicePixelRatio` 対応で行う

## 確認結果

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
