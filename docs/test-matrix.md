# Test Matrix

このファイルは、何がテストされていて、何が未テストかを把握するための地図です。

## Status

- Covered: テストあり
- Partial: 一部のみテストあり
- Not Covered: 未テスト
- Manual: 手動確認のみ
- Out of Scope: 今はテストしない

| Area             | Behavior / Spec                                | Test File                                | Status       | Notes                                                 |
| ---------------- | ---------------------------------------------- | ---------------------------------------- | ------------ | ----------------------------------------------------- |
| LaTeX insertion  | PDFを挿入したときにfigureコードを生成する      | `src/...test.ts`                         | Covered      | 正常系のみ                                            |
| LaTeX insertion  | clipboard画像を保存してLaTeXコードを生成する   | `src/...test.ts`                         | Partial      | 実ファイル保存はmock                                  |
| PDF operation    | PDFをsplitできる                               | `test/split_pdf_all_pages.test.ts`       | Covered      | 複数PDF・既存出力・重複・キャンセルを検証             |
| PDF operation    | pdfcropがない場合にエラーを出す                | `test/crop_pdf_auto.test.ts`             | Covered      | ENOENTと実行失敗を検証                                |
| Image conversion | PNGをPDFに変換する                             | `test/convert_png_to_pdf.test.ts`        | Covered      | Sharpを使用して変換                                   |
| Config           | pasteClipboardImageAs = ask のときpickerを出す |                                          | Not Covered  |                                                       |
| Error handling   | 外部コマンド失敗時にOutputへログを出す         | `test/crop_pdf_auto.test.ts`             | Covered      | Ghostscript失敗時のログ出力を検証                     |
| Path handling    | workspace外の読み書きを拒否する                | `test/workspace_path.test.ts`            | Covered      | prefix一致だけのworkspace外パスも拒否                 |
| Path handling    | symlink経由のworkspace外操作を拒否する         | `test/workspace_path.test.ts`            | Covered      | workspace自体のsymlinkは許可                          |
| PDF operation    | auto cropがworkspace境界を処理前に検証する     | `test/crop_pdf_auto.test.ts`             | Covered      | Ghostscript実行前に入力・出力を検証                   |
| File operation   | 通常UndoでWorkspaceEditの出力を削除する        |                                          | Out of Scope | VS CodeのExplorer Undo stackへ登録されない            |
| File operation   | 未変更の直前変換出力だけを安全に削除する       | `test/undo_last_conversion.test.ts`      | Covered      | 変更・欠損・workspace外symlinkも検証                  |
| PDF operation    | auto cropを安全にキャンセルする                | `test/crop_pdf_auto.test.ts`             | Covered      | 開始前・実行中・待機中と出力未作成を検証              |
| File operation   | Safe Modeで既存出力を安全に処理する            | `test/commit_conversion_outputs.test.ts` | Covered      | 連番・一括判断・停止・バックアップを検証              |
| Image conversion | PNG変換でSafe Modeを適用する                   | `test/png_safe_mode.test.ts`             | Covered      | 一括反映・競合判断・Undo・キャンセルを検証            |
| Command behavior | Safe Modeダイアログの選択結果を判断へ変換する  | `test/safe_mode_dialog.test.ts`          | Covered      | VS Code APIの戻り値をmockして検証                     |
| UI               | Safe Modeのstatus barとmodal dialogを表示する  | `test/safe_mode_status_bar.test.ts`      | Partial      | status bar挙動はCovered。画面上の描画外観は対象外     |
| Command behavior | PDFに変換する出力形式基準コマンド              | `test/convert_to_pdf_command.test.ts`    | Partial      | PNG入力のみ実装。複数PNG・非対応入力・PDFサイズを検証 |
