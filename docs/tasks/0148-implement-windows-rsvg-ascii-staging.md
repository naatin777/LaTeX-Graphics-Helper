# タスク: Windows rsvg-convert用ASCII stagingを実装する

## Status

Todo

## 目的

タスク0147の失敗テストを通す最小実装として、Windows rsvg-convertをASCII staging内で実行する。

## 完了条件

- タスク0147のテストが成功する
- Unicode入出力pathを維持する
- exit code、期待出力の存在、非0 byteを成功条件にする
- rsvg-convertとPuppeteerのengine選択を維持する

## 変更可能なファイル

- タスク0142・0147で特定したrsvg-convert関連実装
- `docs/tasks/README.md`
- `docs/tasks/0148-implement-windows-rsvg-ascii-staging.md`

## 対象外

- Puppeteer engineの変更
- Ghostscriptとpdftocairoの変更

## 関連

- [rsvg-convert staging失敗テスト](0147-add-windows-rsvg-ascii-staging-tests.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- Windows GitHub Actions
