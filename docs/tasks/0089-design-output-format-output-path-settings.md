# タスク: 出力形式基準のoutputPath設定移行方針を決める

## Status

Done

## 目的

出力形式基準コマンドに対応する `outputPath.convertTo*` 設定を追加する前に、既存の入力形式・出力形式ペア別 `outputPath` 設定との優先順位と移行方針を決める。

## 背景

現在の公開コマンドは `convertToPdf` / `convertToPng` / `convertToJpeg` / `convertToWebp` / `convertToAvif` / `convertToSvg` のように出力形式基準へ整理されている。

一方で、出力先設定は以下のようなペア別設定を使い続けている。

- `outputPath.convertPngToPdf`
- `outputPath.convertPdfToPng`
- `outputPath.convertMermaidToSvg`
- `outputPath.convertDrawioToAvif`

このままだと、ユーザーから見るコマンド設計と設定設計が一致しない。

ただし、既存設定を急に廃止すると既存ユーザーの出力先が変わるため、段階移行にする必要がある。

## やること

- `docs/specs/output-format-conversion.md` の出力パス設定移行方針を具体化する
- 新しい `outputPath.convertTo*` 設定の候補を決める
- 新設定と既存ペア別設定の優先順位を決める
- 空文字・空白のみ・未設定・ページ番号変数の扱いを決める
- 次に行うテスト追加タスクと実装タスクを分けて記録する

## 完了条件

- 出力形式基準 `outputPath.convertTo*` 設定の追加方針が仕様に書かれている
- 既存ペア別設定を壊さないfallback方針が仕様に書かれている
- 実装前に必要なテスト観点がタスクとして残っている

## 変更可能なファイル

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0089-design-output-format-output-path-settings.md`
- `docs/tasks/README.md`

## 対象外

- `package.json` の設定追加
- `src/` の実装変更
- テスト追加
- 既存ペア別 `outputPath` 設定の削除

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0048-track-unimplemented-work.md`
- `docs/tasks/0069-define-output-path-template-source-semantics.md`

## 確認方法

- `git diff --check`

## 実装内容

- `outputPath.convertToPdf` / `outputPath.convertToPng` / `outputPath.convertToJpeg` / `outputPath.convertToWebp` / `outputPath.convertToAvif` / `outputPath.convertToSvg` を新設定候補として仕様化した
- 新設定は空文字を既定値にし、空文字またはトリム後に空文字になる場合は既存ペア別設定へfallbackする方針にした
- 新設定が空文字でない場合は、対応する出力形式コマンドでペア別設定より優先する方針にした
- PDF入力などページ出力を含む変換での `${page}` と出力重複の扱いを記録した
- VS Code設定descriptionに複数ページ入力では `${page}` が必要な旨を書く方針にした
- 後続タスクとして0090のテスト追加、0091の最小実装を作成した
