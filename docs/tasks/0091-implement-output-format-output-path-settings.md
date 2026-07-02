# タスク: 出力形式基準outputPath設定を実装する

## Status

Todo

## 目的

追加済みテストを通す最小実装として、出力形式基準の `outputPath.convertTo*` 設定を追加する。

## 完了条件

- `outputPath.convertToPdf` / `outputPath.convertToPng` / `outputPath.convertToJpeg` / `outputPath.convertToWebp` / `outputPath.convertToAvif` / `outputPath.convertToSvg` を設定できる
- 新設定が空文字（トリム後）でない場合は、対応する出力形式コマンドで新設定を優先する
- 新設定が空文字（トリム後）または未設定の場合は、既存ペア別設定へfallbackする
- VS Code設定descriptionに、複数ページ入力の変換時には `${page}` を含める必要がある旨の注意書きを追加する
- 既存ペア別設定は削除しない
- 0090で追加したテストが通る

## 変更可能なファイル

- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `src/`
- 必要なテストファイル

## 対象外

- 既存ペア別 `outputPath` 設定の削除
- outputPathテンプレート変数の追加
- 変換経路の変更
- 画像を1つのPDFへ結合する機能
- PDFページを1つの画像へ結合する機能

## 関連

- `docs/specs/output-format-conversion.md`
- `docs/tasks/0090-add-output-format-output-path-setting-tests.md`

## 確認方法

- `CI=true pnpm run check`
- `CI=true pnpm run test`
