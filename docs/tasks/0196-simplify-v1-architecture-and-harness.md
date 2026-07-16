# v1構造とハーネスを簡素化する

## Status

In Progress

## 目的

v1安全性修正で増えたrepository内ハーネス、task強制、引数伝播、共通化の責務を整理し、安全性を維持したまま人間が理解・レビューできる構造へ戻す。

## 変更内容

- `AGENTS.md`を手書き正本へ戻し、RuleSyncとStop hookを必須導線から外す。
- task templateとindexを軽量化し、0194をBlocked、0195を未着手として保持する。
- command登録、conversion runtime、tool依存、staged batchの責務と引数を整理する。
- Clipboard PasteのUI境界と保存operationを分離する。
- 実装に合わせてPROJECT_STATE、ADR、task補足を更新する。

## 対象外

- 新しいユーザー機能
- release matrixの追加対応
- 設定migration
- Webview機能追加
- 安全性primitiveの削除
- 新しいdependency
- 0194、0195の追加実装

## 確認方法

- safety regression testを維持して実行する。
- `pnpm run check:all`、`pnpm run build`、`pnpm run test:vscode`を実行する。
- Webviewまたはpackagingに影響する場合は対象PlaywrightとVSIX smokeを実行する。
- `git diff --check`と最終検索を実行する。

## 結果

完了後に実測結果と未確認範囲を書く。
