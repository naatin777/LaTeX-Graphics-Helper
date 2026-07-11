# タスク: convert command正常系を複数形式batchへ統合する

## Status

Done

## 目的

同じ出力形式へ変換する正常系を1回の複数選択commandへまとめ、入力形式ごとの検証範囲を維持したままVS Code統合テストを高速化する。

## 変更前ベースライン

- 対象: PDF / PNG / JPEG / WebP / AVIF / SVGに変換するcommand suite
- test数: 60件（同じgrepに一致するpackage.jsonメニュー検証を含む）
- Mocha: 14秒
- wall clock: 17.10秒

## 完了条件

- 同じ出力形式の主要正常系を、複数入力形式を同時選択するbatchテストへ統合する
- PNG、JPEG、WebP、AVIF、SVG、PDF、`.mmd`、`.mermaid`の既存対象範囲を狭めない
- PDF複数ページ出力を引き続き検証する
- 各出力fileが対象形式として読め、sizeが0より大きいことを引き続き検証する
- 設定、非対応入力、同一形式拒否、大文字拡張子、同一形式の複数選択など意味の異なるテストは残す
- `src/`を変更しない
- 同じ測定commandで変更後時間を記録する

## 変更後の結果

### 対象suite

- test数: 60件から45件
- Mocha: 14秒から13秒（約7%短縮）
- wall clock: 17.10秒から15.62秒（1.48秒、約9%短縮）

削除した15件は入力形式の検証を削ったものではない。6つの出力commandごとに画像・PDF入力をbatchへまとめ、各入力の出力fileを個別に読み取って検証している。

`.mmd`と`.mermaid`は元どおり別test caseにする。両方を同じbatchへ含める試行では、Mermaid CLIが使うbrowser processが同時起動し、GitHub ActionsのMocha時間がLinuxで25秒から16秒へ短縮した一方、macOSで28秒から48秒、Windowsで40秒から57秒へ悪化した。1つのtest内で順番に実行する試行もLinux 24秒、macOS 44秒、Windows 56秒となり、test case間で外部processのlifecycleを分離する元の構成より遅かった。そのため、軽量な画像・PDF入力だけをbatch化する。

### VS Code統合テスト全体

- test数: 165件から150件
- Mocha: 15秒から13秒（約13%短縮）

設定、非対応入力、同一形式拒否、大文字拡張子、PDF複数ページ、同一形式の複数選択は独立テストとして維持した。

## 変更可能なファイル

- `test/convert_to_pdf_command.test.ts`
- `test/convert_to_png_command.test.ts`
- `test/convert_to_jpeg_command.test.ts`
- `test/convert_to_webp_command.test.ts`
- `test/convert_to_avif_command.test.ts`
- `test/convert_to_svg_command.test.ts`
- `docs/tasks/README.md`
- `docs/tasks/0149-consolidate-convert-command-tests.md`

## 対象外

- 変換実装の変更
- conversion concurrencyの変更
- fixture方針の変更
- Safe Mode、Undo、cancelテストの統合
- GitHub Actions workflowの変更

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true /usr/bin/time -p ./node_modules/.bin/vscode-test --grep "(PDF|PNG|JPEG|WebP|AVIF|SVG)に変換コマンド"`
- `CI=true pnpm run test:vscode`
