# タスク: Mermaidファイル変換の仕様を決める

## Status

Todo

## 目的

`.mmd`ファイルをExplorerの右クリックcontext menuから、PDF・PNG・SVGなどへ変換できるようにするための仕様を決める。

このタスクでは実装せず、どの出力形式に対応するか、どの変換エンジンを使うか、既存の出力形式基準コマンドへどう統合するかを決める。

## 背景

既存の変換コマンドは、入力形式ごとのコマンドではなく、`PDF`、`PNG`、`SVG`などの出力形式基準で整理している。

Mermaidも`.mmd`専用の独立メニューにするのではなく、可能なら既存の`変換`サブメニュー配下で、出力形式を選ぶ形に揃える。

例:

```text
変換
├ PDF
├ PNG
└ SVG
```

## 完了条件

- `.mmd`入力で対応する出力形式を決める
- Mermaid変換に使うエンジンを決める
- 外部依存を追加する場合は、理由と代替案を書く
- 既存の`docs/specs/output-format-conversion.md`へ反映する内容を決める
- テストすべき範囲を決める
- 実装タスクとテスト追加タスクに分割する

## 変更可能なファイル

- `docs/tasks/0047-design-mermaid-file-conversion.md`
- `docs/tasks/README.md`
- `docs/specs/output-format-conversion.md`
- `docs/research/`
- 必要なら `docs/adr/`

## 対象外

- `.mmd`変換の実装
- dependency追加
- package.jsonのcontext menu変更
- READMEへの機能説明追加

## 検討事項

- Mermaid CLIを使うか、Puppeteer経由で自前描画するか
- 既に`puppeteer-core`を使う方針と揃えられるか
- Mermaidのテーマ、背景色、フォントを設定可能にするか
- `.mermaid`拡張子も対象にするか
- PDF出力時のページサイズをどう決めるか
- PNG/SVG出力時のサイズ確認をどうテストするか
- 変換中のprogress/cancel、Safe Mode、Undoを既存変換と同じ扱いにするか

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/safe-mode.md`
- `docs/tasks/0032-redesign-conversion-commands-by-output-format.md`
- `docs/tasks/0046-implement-convert-to-pdf-svg.md`

## 確認方法

- 仕様と分割方針をユーザーが確認する
