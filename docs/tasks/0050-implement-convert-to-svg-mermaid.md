# タスク: MermaidをSVGに変換する

## Status

Done

## 目的

`latex-graphics-helper.convertToSvg`を追加し、`.mmd`と`.mermaid`をSVGへ変換できるようにする。

初期実装ではMermaid CLIのデフォルト設定を使い、テーマや見た目の設定項目は追加しない。

## 完了条件

- `@mermaid-js/mermaid-cli`をdependencyとして追加する
- `latex-graphics-helper.convertToSvg`を登録する
- Explorer context menuの`変換 > SVG`から`.mmd`と`.mermaid`を変換できる
- Mermaid CLIの`mmdc`を使ってSVGを直接出力する
- Puppeteer管理Chromeのinstallは前提にせず、既定では`browserChannel: "chrome"`でユーザー環境のChromeを使う
- 必要に応じて`convertToSvg.mermaid.puppeteer.executablePath`でブラウザ実行ファイルを指定できる
- 出力先は`outputPath.convertMermaidToSvg`で決める
- Safe Mode、Undo、progress、cancellationを既存変換と同じ扱いにする
- `.mmd`と`.mermaid`以外を`convertToSvg`へ渡した場合は全体停止する
- `0049`で追加したテストが成功する

## 変更可能なファイル

- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `package.nls.json`
- `package.nls.ja.json`
- `src/`
- `test/`
- `docs/tasks/0050-implement-convert-to-svg-mermaid.md`
- `docs/tasks/README.md`

## 対象外

- Mermaid → PDF / PNG / JPEG / WebP / AVIF
- Mermaid theme / look / backgroundColorなどの設定追加
- `@mermaid-js/mermaid-cli`のNode.js API利用
- 既存変換処理の大規模リファクタリング

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/safe-mode.md`
- `docs/research/2026-06-28-mermaid-cli.md`
- `docs/tasks/0049-add-convert-to-svg-mermaid-tests.md`

## 確認方法

- `CI=true pnpm run test`
- 必要に応じて`pnpm run check`
