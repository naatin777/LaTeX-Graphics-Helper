# タスク: cropPdf.configure GUIを実操作できる状態へ仕上げる

## Status

Todo

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
- `docs/specs/crop-pdf-configure.md`
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
- [PDF configure crop仕様](../specs/crop-pdf-configure.md)

## 確認方法

- `pnpm run check`
- `CI=true pnpm run test:playwright -- -g "crop_pdf"`
- `CI=true pnpm run test -- --grep "configure cropコマンド|Webview HTML生成"`
