# タスク: VS Code testのcore / conversion分割を設計する

## Status

Todo

## 目的

VS Code integration testをcoreとconversionに分け、外部tool setupを必要なtestだけに寄せるための設計を決める。

## 完了条件

- 現在のVS Code test fileをcore / conversion / mixedへ分類している
- mixed testをどう分けるか決めている
- `test:vscode:core` と `test:vscode:conversion` の役割を決めている
- 3 OSが必要なtestとLinuxだけでよいtestを分けている
- external tool setupが必要なtestを明記している
- 実装を小さな後続タスクへ分けている

## 変更可能なファイル

- `docs/tasks/0176-design-vscode-test-core-conversion-split.md`
- 必要な `docs/research/`
- `docs/tasks/README.md`

## 対象外

- test fileの移動
- package script変更
- workflow変更

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- 現在のtest file一覧を分類表へ当てはめる
- `git diff --check`
