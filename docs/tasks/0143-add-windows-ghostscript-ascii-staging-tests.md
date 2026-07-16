# タスク: Windows Ghostscript用ASCII scratchの失敗テストを追加する

## Status

Done

## 目的

Windows GhostscriptへUnicode pathを直接渡さず、OS一時directoryのASCII名へcopyして処理する仕様の失敗テストを追加する。

## 完了条件

- タスク0142で決めたscratch仕様をテストする
- 固定PDF fixtureをUnicode workspaceへcopyして実file読み込み経路を通す
- Unicode入力を固定ASCII名の`input.pdf`でGhostscriptへ渡すことを確認する
- 成功時はscratchを削除することを確認する
- Ghostscript失敗・cancel時は論理出力を作らずscratchを残すことを確認する
- 完成出力の論理pathがユーザー指定名を維持することを確認する
- 実装fileを変更しない

## 変更可能なファイル

- `test/`
- `docs/tasks/README.md`
- `docs/tasks/0143-add-windows-ghostscript-ascii-staging-tests.md`

## 対象外

- scratch実装
- pdftocairoとrsvg-convertの変更

## 関連

- [外部コマンド用ASCII scratch仕様](../specs/internal/external-tool-ascii-scratch.md)
- [ADR-0012](../adr/0012-use-os-temp-for-incompatible-windows-tools.md)
- [OS別path互換性調査](../research/2026-07-11-external-tool-path-compatibility.md)

## 確認方法

- `CI=true ./node_modules/.bin/vscode-test --grep "Windows Ghostscript ASCII scratch"`
- `CI=true pnpm run check:all`
