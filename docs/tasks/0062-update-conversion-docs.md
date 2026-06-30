# タスク: 変換機能ドキュメントを現在の実装に合わせる

## Status

Done

## 目的

`docs/test-matrix.md`とREADMEの変換機能説明を、`next/v1`時点の実装に合わせる。

## 背景

`convertToPdf`はPNGのみではなく、JPEG / WebP / AVIF / SVG / Mermaid / editable Draw.io画像にも対応済み。

一方で、`convertToPng`などの他の出力形式基準コマンドはまだ未実装であり、READMEやテストマトリクスの記述が実装状態とずれている。

## 完了条件

- `docs/test-matrix.md`の`convertToPdf`対応入力を現在の実装に合わせる
- README.ja.mdを現在の公開コマンドに合わせる
- README.mdをREADME.ja.mdの内容に合わせて更新する
- 実装コードは変更しない

## 変更可能なファイル

- `docs/tasks/0062-update-conversion-docs.md`
- `docs/tasks/README.md`
- `docs/test-matrix.md`
- `README.ja.md`
- `README.md`

## 対象外

- 変換機能の追加実装
- 設定項目の追加・削除
- テスト追加

## 確認方法

- `git diff --check`
