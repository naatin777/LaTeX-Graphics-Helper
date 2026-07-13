# タスク: Windows pdftocairo出力用ASCII stagingを実装する

## Status

Done

## 目的

タスク0145の失敗テストを通す最小実装として、Windows pdftocairoの出力をASCII名で受け、論理outputPathへ反映する。

## 完了条件

- タスク0145のテストが成功する
- Unicode outputPathへ正しい名前で反映する
- exit code、期待出力の存在、非0 byteを成功条件にする
- PDFから各出力形式への既存routeを壊さない

## 変更可能なファイル

- タスク0142・0145で特定したpdftocairo関連実装
- `docs/tasks/README.md`
- `docs/tasks/0146-implement-windows-pdftocairo-ascii-staging.md`

## 対象外

- Ghostscriptとrsvg-convertの変更
- 変換形式の追加

## 関連

- [pdftocairo staging失敗テスト](0145-add-windows-pdftocairo-ascii-staging-tests.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- Windows GitHub Actions

## 確認結果

- `CI=true pnpm run check:all`: 成功
- `CI=true ./node_modules/.bin/vscode-test --grep "Windows pdftocairo ASCII scratch"`: 7件成功
- `CI=true pnpm run test:vscode`: 162件成功
- Windows GitHub Actions: PR作成後に確認する
