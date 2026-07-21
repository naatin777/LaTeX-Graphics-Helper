# タスク: Mermaid描画設定の仕様を決める

## Status

Spec Complete — `docs/specs/product/mermaid-render-settings.md` に記録済み。実装は別タスク。

## 目的

Mermaid変換で theme / look / backgroundColor などをsettings.jsonから変更できるようにするか判断し、必要な仕様を決める。

## 完了条件

- 初期対応する設定項目を決める
- Mermaid CLIへ渡す方法を決める
- 既定値を決める
- テスト方針を決める
- 実装する場合の次タスクを作れる状態になっている

## 変更可能なファイル

- `docs/specs/`
- `docs/tasks/0099-design-mermaid-render-settings.md`
- 必要なら `docs/research/`
- 必要なら `docs/tasks/README.md`

## 対象外

- 実装
- dependency追加
- 画像pixel完全一致テストの導入

## 関連

- [0047: Mermaidファイル変換の仕様を決める](0047-design-mermaid-file-conversion.md)

## 確認方法

- Mermaid設定の採用範囲と未対応範囲が明示されていることを確認する
