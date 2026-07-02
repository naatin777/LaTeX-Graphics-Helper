# タスク: 出力形式基準コマンド実装後の変換ドキュメントを同期する

## Status

Done

## 目的

`convertToPng` / `convertToJpeg` / `convertToWebp` / `convertToAvif` 実装後に古くなったドキュメントを、現在の実装状態へ合わせる。

## 背景

0048の未実装一覧では、出力形式基準コマンドやMermaid / Draw.ioの変換組み合わせが未実装として残っている。

現在はPDF / PNG / JPEG / WebP / AVIF / SVGへの出力形式基準コマンドが実装され、READMEやtest matrixの記述も古くなっている。

## やること

- `docs/tasks/0048-track-unimplemented-work.md` の実装状態を現在に合わせる
- `docs/test-matrix.md` にPNG/JPEG/WebP/AVIF/SVG変換のテスト状況を反映する
- `README.ja.md` の変換機能説明を現在の実装に合わせる
- `README.md` を `README.ja.md` に合わせて英訳更新する

## 完了条件

- 出力形式基準コマンドの実装状態が未実装扱いされていない
- READMEの対応入力・出力形式が現在の実装と一致している
- test matrixで主要な変換コマンドのテストファイルが分かる

## 対象外

- 実装変更
- 変換対応形式の追加
- テスト追加
- 外部依存の変更

## 確認方法

- `git diff --check`
- `CI=true pnpm run check`

## 実装内容

- 0048の未実装一覧を現在の実装状態に合わせて更新した
- `docs/test-matrix.md`へPNG/JPEG/WebP/AVIF/SVGの出力形式基準コマンドを追加した
- `README.ja.md`の変換説明を現在の対応形式へ更新した
- `README.md`を`README.ja.md`に合わせて英訳更新した
