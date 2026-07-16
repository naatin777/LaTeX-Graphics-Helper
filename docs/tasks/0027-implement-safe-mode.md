# タスク: Safe Modeをcropとsplitへ実装する

## Status

Done

## 目的

status barで切り替えられるSafe Modeを実装し、cropとsplitの既存出力を安全に扱う。

## 完了条件

- 初期値ONでglobalStateへ保存する
- status barにON/OFFを表示する
- status barから状態を切り替えられる
- ON時の競合確認を1回だけ表示する
- 両方残す、上書きしない、上書きするを実装する
- OFF時は確認せずバックアップ後に上書きする
- cropとsplitへ適用する
- 失敗時に新規出力を削除し、上書き前ファイルを復元する
- 直前の変換取消で上書き前ファイルを復元する
- `.vscode-test.mjs`を使用するテストを1回以上実行する

## 変更可能なファイル

- `src/application/safe_mode.ts`
- `src/commands/safe_mode.ts`
- `src/commands/crop_pdf_auto.ts`
- `src/commands/split_pdf_all_pages.ts`
- `src/commands/undo_last_conversion.ts`
- `src/operations/commit_conversion_outputs.ts`
- `src/operations/crop_pdf_auto.ts`
- `src/operations/split_pdf_all_pages.ts`
- `src/operations/undo_last_conversion.ts`
- `src/extension.ts`
- `package.json`
- `package.nls.json`
- `package.nls.ja.json`
- `docs/specs/internal/auto-crop.md`
- `docs/specs/internal/split-pdf-all-pages.md`
- `docs/specs/internal/undo-last-conversion.md`
- `docs/specs/internal/safe-mode.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- `docs/tasks/0027-implement-safe-mode.md`

## 対象外

- PNG変換へのSafe Mode適用
- 複数回分の取消履歴
- 通常Undoのkeybinding追加

## 関連

- `docs/specs/internal/safe-mode.md`
- `docs/tasks/0026-add-safe-mode-tests.md`

## 確認方法

- `pnpm run check:all`
- `pnpm run test`

## 実施結果

- Safe Modeの初期値をONとし、`ExtensionContext.globalState`へ保存するようにした
- `onStartupFinished`で拡張機能を有効化し、status barへON/OFFを表示する
- status barと`latex-graphics-helper.toggleSafeMode` commandから状態を切り替えられる
- ON時は競合件数を示す確認を1回だけ表示する
- 「両方残す」は拡張子前へ最小の連番を付ける
- 「上書きしない」と確認を閉じた場合は出力を反映しない
- 「上書きする」は作業領域へバックアップしてから反映する
- OFF時は確認せず、バックアップ後に上書きする
- cropとsplitの出力反映を共通処理へ統合した
- 反映失敗時は新規出力を削除し、上書き出力をバックアップから復元する
- 直前の変換取消で上書き前ファイルを復元する
- 出力またはバックアップが変更された場合は取消を拒否する
- `pnpm run check:all`成功
- `.vscode-test.mjs`を使用する`pnpm run test`成功（49 tests）

## 残る作業

- PNG変換は現在直接出力する未コミット実装のため、`0028`で安全な作業領域とSafe Modeへ統合する
