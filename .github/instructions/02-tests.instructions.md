---
description: テストと検証の方針
applyTo: "**/*"
---

## テスト方針

- 重要な仕様に対してテストを書く。
- 内部実装ではなく、外から見た振る舞いをテストする。
- UIの細部やまだ揺れている仕様のテストは後回しでよい。
- カバレッジを追う前に、主要な挙動を安定させる。
- VS Code command testで通知を出す可能性がある場合、`executeCommand`を直接`await`せず、通知を閉じてからcommand実行Promiseを待つ。
- 通知待ち対策には`test/helpers/vscode_command.ts`のhelperを使う。
- 画像/PDF変換の主要正常系は、固定fixtureを一時workspaceへコピーして実ファイル読み込み経路を通す。
- 固定fixture方式は、同じ目的のプログラム生成・base64埋め込みテストへ追加して並存させず、既存テストを置き換える。置換時に既存の検証観点を失わない。
- 境界値を厳密に作る単体テストや固定fixtureでは再現しづらい異常系は、目的が異なる場合に限り残してよい。
- 詳細は`docs/test-policy.md`の「変換テストのfixture方針」に従う。

優先してテストするもの。

- データ変換
- path handling
- command behavior
- configuration behavior
- error handling
- LaTeX code generation
- PDF / image conversion logic

## CI環境変数の使い分け

- ローカルの通常確認では`CI=true`を付けない。
- `pnpm run check:all`、`pnpm run test`、`pnpm run test:vscode`は通常の環境変数で実行する。
- PlaywrightのCI専用挙動（retry、`forbidOnly`、GitHub reporter）を手元で再現するときだけ`CI=true pnpm run test:playwright`を使う。
- GitHub ActionsではGitHubが設定する`CI`環境変数を利用し、workflowや通常の確認commandで`CI=true`を重複指定しない。
- CI依存の失敗を調査するときは、`CI=true`を付ける理由と対象commandをタスクまたは作業メモへ記録する。

## Test / Implementation Separation

テスト追加と実装変更を同じタスクで行わない。

### Test Planning Phase

この段階ではコードを変更しない。

やること:

- どの仕様をテストするかを書く
- どのファイルにテストを追加するかを書く
- 何をmockするかを書く
- 何をテストしないかを書く

### Test Addition Phase

この段階では test file のみ変更する。

禁止:

- `src/` の実装変更
- 既存実装のリファクタ
- 仕様変更
- dependency追加

### Implementation Phase

この段階では、追加済みテストを通すための最小実装のみ行う。

禁止:

- テスト期待値の都合のよい書き換え
- 関係ないテストの修正
- ついでのリファクタ
