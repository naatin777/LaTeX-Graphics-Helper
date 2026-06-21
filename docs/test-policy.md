# Test Policy

このプロジェクトでは、テストを「仕様を守るための安全網」として扱う。

## 基本方針

- テストは内部実装ではなく、外から見た振る舞いに対して書く。
- 何をテストしているか分からないテストを書かない。
- mock を使う場合は、何を mock していて、何をテスト対象から外しているかを明記する。
- テスト追加と実装変更を同じタスクで行わない。
- Codexには、まずテスト方針を出させてから作業させる。

## テスト対象の優先順位

優先してテストするもの。

- LaTeX code generation
- PDF / image conversion の入出力
- path handling
- configuration behavior
- command behavior
- error handling
- 外部ツールが存在しない場合の挙動

優先度が低いもの。

- UI文言の細かい違い
- 実装内部の関数分割
- private helper の細かい呼び出し順
- mock の呼び出し回数だけを見るテスト

## mock 方針

mock は使ってよい。

ただし、mock が多いテストでは次を明記する。

- Test target: 何をテストしているか
- Mocked: 何をmockしているか
- Not tested: このテストでは何を確認していないか

例:

```ts
// Test target:
// - PDFファイルをLaTeX figureとして挿入するコードが生成されること
//
// Mocked:
// - vscode.window.showInputBox
// - vscode.workspace.fs
//
// Not tested:
// - VS Code本体の挙動
// - 実際のファイル書き込み
// - LaTeXコンパイル結果
```

## 禁止するテスト

- 実装の都合だけを固定するテスト
- 何を守っているか説明できないテスト
- mock の呼び出し回数だけを確認するテスト
- 仕様変更と一緒に期待値を書き換えるテスト
