# タスク: outputPathのOS禁止名検証を実装する

## Status

Done

## 目的

追加済み失敗テストを通すため、`outputPath`を実行先OSの規則で変換開始前に検証する。

## Implementation Phase

追加済みテストを通す最小実装だけを行う。

## 完了条件

- `resolveOutputPath`が既定でExtension HostのOS規則を使う
- testからWindows / POSIX規則を注入できる
- Windowsの禁止文字・制御文字・予約名・空白・末尾ピリオドを拒否する
- POSIXでNULを拒否する
- 無効な出力パスではcrop処理・進捗表示・作業ファイル作成を開始しない
- 多言語・絵文字・全角空白を含む既存正常系を維持する
- 禁止文字を自動置換しない

## 変更可能なファイル

- `src/config/resolve_output_path.ts`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0133-implement-output-path-os-name-validation.md`

## 対象外

- テスト期待値の変更
- path長上限
- filesystem固有制限の事前判定
- エラー文言の多言語対応
- unrelated refactoring

## 関連

- [outputPath検証仕様](../specs/output-path-validation.md)
- [0132: outputPathのOS禁止名失敗テストを追加する](0132-add-output-path-os-name-validation-tests.md)

## 確認方法

- `CI=true pnpm run check:all`
- `CI=true pnpm run test:vscode`
- `CI=true pnpm run test:playwright`
