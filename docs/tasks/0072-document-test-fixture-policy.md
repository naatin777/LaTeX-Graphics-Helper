# タスク: 変換テストのfixture方針を記録する

## Status

Done

## 目的

画像/PDF変換テストで、base64文字列などの埋め込みfixtureに寄りすぎず、実ファイルを読み込む経路をできるだけ通す方針を明文化する。

## 完了条件

- `docs/test-policy.md` に変換テストのfixture方針を追加する
- `AGENTS.md` にAI向けの短い注意を追加する
- タスク一覧にこのタスクを追加する

## 変更可能なファイル

- `docs/test-policy.md`
- `AGENTS.md`
- `docs/tasks/0072-document-test-fixture-policy.md`
- `docs/tasks/README.md`

## 対象外

- 既存テストのbase64 fixture一括置換
- 新しいfixture画像の追加
- 変換実装の変更

## 関連

- `docs/test-policy.md`
- `AGENTS.md`

## 確認方法

- `pnpm run check`
