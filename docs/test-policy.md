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

## 変換テストのfixture方針

画像/PDF変換テストでは、できるだけ実ファイルを読み込む経路を通す。

優先順位:

1. `test/fixtures/` などに置いたfixtureファイルをそのまま入力にする
2. 既存fixtureファイルを読み込み、テスト中の一時ディレクトリへ別形式の入力ファイルを生成する
3. どうしても必要な場合だけ、小さなbase64文字列などの埋め込みfixtureを使う

理由:

- 実際のextension利用時と同じfile path / file read経路を通せる
- base64文字列だけでは、ファイル読み込み・拡張子・metadata取得・OS差の問題を見落としやすい
- 変換テストでは「変換関数がBufferを処理できること」だけでなく、「ユーザーが選んだファイルを読んで変換できること」が重要

例:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import * as vscode from "vscode";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const sourcePng = path.join(testDirectory, "..", "..", "test", "fixtures", "test.png");
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "lgh-convert-test-"));

try {
  const sourceWebp = path.join(temporaryDirectory, "source.webp");

  await sharp(await readFile(sourcePng))
    .webp()
    .toFile(sourceWebp);

  await vscode.commands.executeCommand(commandId, vscode.Uri.file(sourceWebp));
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
```

base64埋め込みを使ってよい例:

- 外部ツールやライブラリで生成が重すぎる形式を、最小fixtureとして固定したい場合
- 既存fixtureから安定して生成できない形式を扱う場合
- そのテストの目的がファイル読み込みではなく、特定のバイナリ内容への耐性確認である場合

base64埋め込みを使う場合は、コメントまたはタスクに理由を書く。

## 禁止するテスト

- 実装の都合だけを固定するテスト
- 何を守っているか説明できないテスト
- mock の呼び出し回数だけを確認するテスト
- 仕様変更と一緒に期待値を書き換えるテスト

## VS Code command testの通知待ち対策

VS Code commandが`showInformationMessage`、`showWarningMessage`、`showErrorMessage`を使う場合、テストで`vscode.commands.executeCommand(...)`を直接`await`すると、通知の選択待ちで停止することがある。

通知を出す可能性があるcommand testでは、以下の順序にする。

1. command実行Promiseを変数に保持する
2. helperで通知を閉じながらcommand実行Promiseの完了を待つ
3. command完了後に、ファイル生成など期待する副作用をassertする

原則として、`test/helpers/vscode_command.ts`のhelperを使う。

例:

```ts
const commandExecution = vscode.commands.executeCommand(commandId, uri);

await runCommandAndClearNotificationsUntilDone(commandExecution);

await assertFileExists(outputPath);
```

エラー通知だけを確認する場合:

```ts
const commandExecution = vscode.commands.executeCommand(commandId, uri);

await runCommandAndClearNotificationsUntilDone(commandExecution);
```

## 再発防止メモ

### 変換テストのtimeoutを安易に伸ばさない

変換テストがWindows CIだけでtimeoutした場合、テストの個別timeoutを伸ばして通すのではなく、変換処理が止まっている原因を先に確認する。

2026-06-27時点では、AVIFからPDFへの変換テストで、`sharp(sourcePath)`のfile path入力を同じpipeline instanceで`metadata()`と`png().toBuffer()`に使い回したことが原因候補になった。修正では、先に`readFile(sourcePath)`でBuffer化し、metadata取得と変換で別々に`sharp(sourceBuffer)`を作るようにした。

今後、sharpを使う変換テストでOS依存のtimeoutが出た場合は、まず以下を確認する。

- file path入力ではなくBuffer入力にできないか
- 1つのsharp instanceを複数目的に使い回していないか
- AVIF/WebPなどdecode経路が重い形式だけで失敗していないか
- 長い`this.timeout(...)`で失敗を隠していないか

### VS Codeテストでwindowが閉じない場合

`vscode-test`実行後にVS Code windowが閉じない場合、テストが完了していないか、command実行Promise・通知・progress・外部processのいずれかが未解決のまま残っている可能性が高い。

再発時は、以下を優先して確認する。

- `vscode.commands.executeCommand(...)`を直接`await`して通知待ちになっていないか
- 通知を出すcommand testで`test/helpers/vscode_command.ts`のhelperを使っているか
- `withProgress`やキャンセル可能処理のPromiseがresolve/rejectしているか
- 外部processやfile watcherをテスト後に閉じているか
- 固定秒数の待機で偶然通すテストになっていないか

VS Code windowが閉じない問題は、テスト完了判定そのものを壊すため、単にtimeoutを伸ばす対応はしない。
