---
name: lgh-verify
description: LaTeX Graphics Helperの変更内容に応じて、必要十分な型チェック、lint、format、ローカライズ確認、Unit Test、Integration Test、Playwright Testを選択して実行する。実装や修正の完了前に使用する。
---

# LHG変更検証

現在の差分から、変更を検証できる最小限のチェックを選択する。

## 手順

1. `git diff --stat`と`git diff --name-only`を確認する。
2. 関連する差分を読む。
3. 変更された動作と境界を特定する。
4. 必要なチェックを実行する。
5. 実行結果と未検証事項を報告する。

## 基本チェック

通常の実装変更では実行する。

```bash
pnpm run check
```

テストコードまたはテスト用TypeScript設定を変更した場合は追加する。

```bash
pnpm run check:test
```

## 動作テスト

- 純粋関数、パーサー、パス判定は関連するUnit Testを実行する。
- VS Code API、ファイル操作、外部CLI、変換フローは関連するIntegration Testを実行する。
- VS Code Electron環境が必要な場合は`pnpm test`を実行する。
- Webviewの表示や操作は関連するWebview Testまたは`pnpm run test:playwright`を実行する。

## 規則

- LSP診断だけを完了根拠にしない。
- 既存テストを弱体化または削除しない。
- 理由なく無関係な重いテストを実行しない。
- 実行していないコマンドを成功したと報告しない。
- 実行できない確認は、理由と残る不確実性を報告する。

## 報告形式

- 実行したコマンド
- 確認できたこと
- 失敗
- 未確認
