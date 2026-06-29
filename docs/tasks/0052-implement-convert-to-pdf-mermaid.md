# タスク: MermaidをPDFに変換する

## Status

Done

## 目的

`latex-graphics-helper.convertToPdf`で`.mmd`と`.mermaid`をPDFへ変換できるようにする。

`0051`で追加した失敗テストを通すための最小実装に限定する。

## 完了条件

- `convertToPdf`が`.mmd`と`.mermaid`を対応入力として受け付ける
- Mermaid CLIの`run` APIでPDFを直接出力する
- `.mmd` / `.mermaid`がExplorer context menuの`変換 > PDF`対象になる
- Safe Mode、Undo、progress、cancellationは既存`convertToPdf`の流れに乗せる
- `0051`で追加したテストが成功する

## 変更可能なファイル

- `src/`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/tasks/0052-implement-convert-to-pdf-mermaid.md`
- `docs/tasks/README.md`
- 必要なら `docs/specs/output-format-conversion.md`

## 対象外

- テスト期待値の変更
- Mermaid → PNG / JPEG / WebP / AVIF
- Mermaidのテーマ、背景色、フォント設定
- 画像比較テスト
- 既存PDF変換処理の大規模リファクタリング

## 関連

- `docs/tasks/0051-add-convert-to-pdf-mermaid-tests.md`
- `docs/tasks/0050-implement-convert-to-svg-mermaid.md`
- `docs/specs/output-format-conversion.md`
- `docs/research/2026-06-28-mermaid-cli.md`

## 確認方法

- `CI=true pnpm run check`
- `CI=true pnpm run test`
