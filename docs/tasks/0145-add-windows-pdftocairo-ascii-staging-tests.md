# タスク: Windows pdftocairo出力用ASCII stagingの失敗テストを追加する

## Status

Done

## 目的

Windows pdftocairoの出力先をASCII名に限定し、変換後にユーザー指定のUnicode outputPathへ反映する仕様の失敗テストを追加する。

## 完了条件

- Unicode入力pathはそのまま読めるという実測結果を反映する
- pdftocairoへ渡す出力prefixがASCII名になることを確認する
- 文字化けした別名出力を成功扱いしないことを確認する
- PNG、JPEG、WebP、AVIF、SVGへ影響する経路を整理する
- 実装fileを変更しない

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0145-add-windows-pdftocairo-ascii-staging-tests.md`

## 対象外

- staging実装
- Ghostscriptとrsvg-convertの変更

## テスト計画

- 固定PDF fixtureをUnicode・絵文字・全角空白を含む論理入力pathへcopyする
- Windows platformとASCII scratch base候補をoperationへ注入する
- pdftocairo相当runnerをmockし、tool入力が`input.pdf`、PNG系tool出力が`output.png`、SVG tool出力が`output.svg`になることを確認する
- tool出力pathから導出するpdftocairo prefixが`output`になることを確認する
- PNG、JPEG、WebP、AVIF、SVGの各routeで、論理出力名と出力形式を維持することを確認する
- 期待pathと異なる別名出力、期待pathの0 byte出力を成功扱いせず、論理出力へ反映しないことを確認する
- pdftocairo実体、VS Code command UI、Safe Modeの選択肢、Ghostscript、rsvg-convertはmockまたは対象外とする

## 関連

- [ASCII staging仕様](0142-design-ascii-staging-for-external-tools.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)

## 確認方法

- 追加した失敗テスト
- `CI=true pnpm run check:all`

## 確認結果

- `CI=true pnpm run check:all`: 成功
- `CI=true ./node_modules/.bin/vscode-test --grep "Windows pdftocairo ASCII scratch"`: 想定どおり7件失敗
  - PNG、JPEG、WebP、AVIF、SVGの5件は、Unicode論理入力pathがそのままrunnerへ渡るため失敗
  - 別名出力はASCII scratch外へ作られるため失敗
  - 0 byte出力は成功扱いされるため失敗
