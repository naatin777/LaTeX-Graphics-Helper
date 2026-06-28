# タスク: MermaidをSVGに変換する失敗テストを追加する

## Status

Done

## 目的

`latex-graphics-helper.convertToSvg`で`.mmd`と`.mermaid`をSVGへ変換できることを、実装前にテストとして固定する。

このタスクではテストだけを追加し、実装は行わない。

## 完了条件

- `convertToSvg`コマンドがMermaid入力を受け付けることを確認するテストを追加する
- `.mmd`から`.svg`が生成されることを確認するテストを追加する
- `.mermaid`から`.svg`が生成されることを確認するテストを追加する
- SVG出力が`<svg`を含み、Mermaid由来のテキストを含むことを確認する
- context menu / package manifest上で`.mmd` / `.mermaid`が`変換 > SVG`対象になることを確認する
- 追加したテストが、実装前に失敗することを確認する

## 変更可能なファイル

- `test/`
- `docs/tasks/0049-add-convert-to-svg-mermaid-tests.md`
- `docs/tasks/README.md`

## 対象外

- `src/`の実装変更
- `package.json`の実装変更
- dependency追加
- `@mermaid-js/mermaid-cli`の追加
- Mermaid → PDF / PNG / JPEG / WebP / AVIF

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0047-design-mermaid-file-conversion.md`
- `docs/tasks/0050-implement-convert-to-svg-mermaid.md`

## 確認方法

- `CI=true pnpm run test`
- 実装前なので、追加したテストが失敗することを確認する
