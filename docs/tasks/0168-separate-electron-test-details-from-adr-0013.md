# タスク: ADR-0013からElectron testの実行詳細を分離する

## Status

Done

## 目的

ADR-0013を「Webview visual testの正本に実VS Code上のPlaywright Electronを使う」という永続判断へ絞り、VS Code version、theme、fixture、golden、導入順をtest policyとtaskへ移す。

## 完了条件

- ADR-0013にPlaywright Electronを採用する判断、理由、trade-offが残っている
- 固定version、theme、fixture、screenshot条件、task順をADRへ重複させていない
- `docs/specs/internal/test-policy.md`と関連taskへlinkしている
- Playwright Electron採用判断自体を変更していない
- test、snapshot、workflow、dependencyを変更していない

## 変更可能なファイル

- `docs/adr/0013-use-vscode-electron-for-webview-visual-tests.md`
- `docs/tasks/0168-separate-electron-test-details-from-adr-0013.md`
- `docs/tasks/README.md`

## 対象外

- Electron testの実行条件変更
- browser Playwrightの削除
- test、snapshot、workflow、dependencyの変更

## 関連

- [ADRの運用方針](../adr/README.md)
- [テスト方針](../specs/internal/test-policy.md)
- [0152: VS Code Electron E2EでWebview visual testを設計する](0152-design-vscode-electron-e2e.md)
- [0153: VS Code Electron Playwright harnessを追加する](0153-add-vscode-electron-harness.md)
- [0154: Crop PDF ConfigureのElectron E2Eとtheme snapshotを追加する](0154-add-crop-pdf-configure-electron-e2e.md)

## 確認方法

- ADR-0013から採用理由とtrade-offを確認できることを確認する
- 詳細な実行条件の正本がtest policyまたはtaskにあることを確認する
- `git diff --check`

## 実施結果

- ADR-0013に実VS Code上のPlaywright Electronをvisual testの正本とする判断、理由、trade-off、結果、見直し条件を残した
- VS Code固定version、theme、fixture、golden、screenshot、待機条件、導入順、具体的なPDF検証をADRから削除した
- 詳細の正本である`docs/specs/internal/test-policy.md`のPlaywright Electron節と0152・0153・0154へlinkした
- Electron側の同等coverageが安定するまでbrowser testを維持する段階移行の判断は残した
- test、snapshot、workflow、dependencyは変更していない
