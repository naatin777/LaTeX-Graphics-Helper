# Test Matrix

このファイルは、何がテストされていて、何が未テストかを把握するための地図です。

## Status

- Covered: テストあり
- Partial: 一部のみテストあり
- Not Covered: 未テスト
- Manual: 手動確認のみ
- Out of Scope: 今はテストしない

| Area             | Behavior / Spec                                | Test File                           | Status       | Notes                                      |
| ---------------- | ---------------------------------------------- | ----------------------------------- | ------------ | ------------------------------------------ |
| LaTeX insertion  | PDFを挿入したときにfigureコードを生成する      | `src/...test.ts`                    | Covered      | 正常系のみ                                 |
| LaTeX insertion  | clipboard画像を保存してLaTeXコードを生成する   | `src/...test.ts`                    | Partial      | 実ファイル保存はmock                       |
| PDF operation    | PDFをsplitできる                               | `test/split_pdf_all_pages.test.ts`  | Covered      | 複数PDF・既存出力・重複・キャンセルを検証  |
| PDF operation    | pdfcropがない場合にエラーを出す                |                                     | Not Covered  | 優先度高                                   |
| Image conversion | PNGをPDFに変換する                             |                                     | Partial      | 実変換はmock                               |
| Config           | pasteClipboardImageAs = ask のときpickerを出す |                                     | Not Covered  |                                            |
| Error handling   | 外部コマンド失敗時にOutputへログを出す         |                                     | Not Covered  |                                            |
| Path handling    | workspace外の読み書きを拒否する                | `test/workspace_path.test.ts`       | Covered      | prefix一致だけのworkspace外パスも拒否      |
| Path handling    | symlink経由のworkspace外操作を拒否する         | `test/workspace_path.test.ts`       | Covered      | workspace自体のsymlinkは許可               |
| PDF operation    | auto cropがworkspace境界を処理前に検証する     | `test/crop_pdf_auto.test.ts`        | Covered      | Ghostscript実行前に入力・出力を検証        |
| File operation   | 通常UndoでWorkspaceEditの出力を削除する        |                                     | Out of Scope | VS CodeのExplorer Undo stackへ登録されない |
| File operation   | 未変更の直前変換出力だけを安全に削除する       | `test/undo_last_conversion.test.ts` | Covered      | 変更・欠損・workspace外symlinkも検証       |
| PDF operation    | auto cropを安全にキャンセルする                | `test/crop_pdf_auto.test.ts`        | Covered      | 開始前・実行中・待機中と出力未作成を検証   |
