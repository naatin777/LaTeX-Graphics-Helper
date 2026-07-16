# タスク: Safe ModeのVS Code UI挙動を自動テストする

## Status

Done

## 目的

Safe Modeのstatus barとダイアログに関するUI挙動を、実際の目視確認ではなく自動テストで固定する。

目視確認は開発フローを重くするため、画面の見た目そのものではなく、VS Code APIへ渡す値と状態変化を検証する。

`0030`ではSafe Modeダイアログの選択結果を検証済みなので、このタスクではstatus barまわりを中心に検証する。

## Test target

- 初期化時にstatus bar itemを作成する
- status barのtextが初期状態で`$(shield) Safe Mode: ON`になる
- status bar itemのcommandが`latex-graphics-helper.toggleSafeMode`になる
- status bar itemのtooltipが設定される
- status bar itemの`show()`が呼ばれる
- toggle commandを実行するとON/OFFが切り替わり、status bar textが更新される
- `ExtensionContext.globalState`に保存済みのOFF状態から初期化すると`Safe Mode: OFF`になる
- `ExtensionContext.subscriptions`へstatus bar itemとcommand disposableが登録される

## Mocked

- `vscode.window.createStatusBarItem`
- `vscode.commands.registerCommand`
- `ExtensionContext.globalState`相当の状態保存

## Not tested

- 実際のVS Code画面上のstatus bar描画
- status bar itemの表示位置
- ダイアログの画面上の外観
- VS Code再起動そのもの
- crop、split、PNG変換の実ファイル処理

## 完了条件

- status bar初期表示を検証するテストがある
- toggle command実行時の状態変更とstatus bar更新を検証するテストがある
- globalStateから状態復元されることを検証するテストがある
- `subscriptions`登録を検証するテストがある
- test file冒頭にTest target、Mocked、Not testedが記載されている
- 実装変更を混ぜず、必要なら別Implementation Phaseタスクを作成する

## 変更可能なファイル

- `docs/tasks/0031-verify-safe-mode-ui-manually.md`
- `docs/test-matrix.md`
- `docs/tasks/README.md`
- Safe Mode UI挙動専用の新規test file

## 対象外

- 実装変更
- UIデザイン変更
- 発見した不具合の修正
- 実際のVS Code画面での目視確認

## 関連

- `docs/specs/internal/safe-mode.md`
- `docs/tasks/0029-integrate-png-conversion-with-safe-mode.md`
- `docs/tasks/0030-add-safe-mode-dialog-result-tests.md`

## 確認方法

- `pnpm run check:test`
- `pnpm run test`
