# タスク: 実fixtureと画像比較を使うテスト方針を決める

## Status

Done

## 目的

プログラムで生成した単純なPDF・画像だけに頼らず、リポジトリへ固定した複雑な実fixtureをコピーして使い、変換後の内容ずれまで検出できるテスト方針を決める。

## 完了条件

- 実fixtureの保存・コピー・更新方針を`docs/specs/internal/test-policy.md`へ記録する
- PDF・画像の内容ずれを検出する段階的な検証方針を決める
- Playwrightとvscode-testの役割分担を決める
- Playwright Electronを採用する前に確認すべき事項を記録する
- fixtureが必要になるタイミングと、ユーザーへ依頼する内容を明確にする

## 変更可能なファイル

- `docs/specs/internal/test-policy.md`
- `docs/research/`
- `docs/tasks/README.md`
- `docs/tasks/0126-design-real-fixture-and-visual-testing.md`

## 対象外

- fixtureファイルそのものの追加
- Playwright Electronのdependency追加
- 既存テストランナーの置き換え
- 実crop・画像比較テストの実装
- CI workflowの変更

## 関連

- [テスト方針](../specs/internal/test-policy.md)
- [Playwright ElectronとVS Code Webviewテストの調査](../research/2026-07-10-playwright-electron-vscode-webview-testing.md)
- [0072: 変換テストのfixture方針を記録する](0072-document-test-fixture-policy.md)
- [0123: cropPdf.configureの操作テストを追加する](0123-add-crop-pdf-configure-operation-tests.md)

## 確認方法

- `docs/specs/internal/test-policy.md`でfixture、変換結果、Webviewの各テスト層が区別されていることを確認する
- 外部仕様に基づく判断がresearch noteへ記録されていることを確認する
