# Test policy

## Principle

test runtimeはdirectory名やrunner統一ではなく、検証するcontractと必要なoracleから選択する。

## VS Code Extension Host

pre-package testはすべてVS Code Extension Hostを正式なownerとする。`pnpm run test`は`build:test`の後に`vscode-test`を実行し、`out/test/**/*.test.js`を除外せずに実行する。このruntimeの選択は[ADR-0018](../../adr/0018-use-extension-host-for-pre-package-tests.md)を正本とする。

このruntimeでは、次のcontractを確認する。

- pure logic
- Node filesystem
- injected platform behavior
- process abstraction
- command registry
- configuration
- workspace
- globalState
- provider API
- notification / progress

## VS Code Electron

次をoracleとするtestで使用する。

- actual VS Code window
- Webview frame
- Host message bridge
- critical user journey
- installed VSIX behavior

Electron Playwrightは、直前にpackageして隔離されたextensions directoryへinstallしたVSIXだけを対象にする。VSIX pathがない場合は失敗させ、Extension Development Hostとしてsource directoryを読み込まない。この境界とCIの責務分離は[ADR-0017](../../adr/0017-use-installed-vsix-for-electron-e2e.md)を正本とする。

Browser Playwrightは使用しない。Webview protocol、validation、状態変換などBrowser実装を必要としない契約はExtension Host testで確認する。実VS Codeで意味を持つWebview表示、操作、Host message bridgeはpackage済みVSIXのElectron Playwrightで確認する。browser DOMだけのlayout、zoom、mocked Host細部はVS Codeの配布物契約を証明しないため、独立した回帰対象にしない。

## Decision

- pre-package testではVS Code Extension Hostを正式採用する。
- Extension Host testはLinux、macOS、Windowsの3 OSで恒久的に維持する。
- Node専用runnerやExtension Hostからのtest file除外は持たない。
- Browser Playwrightは廃止し、配布物E2Eは3 OSのpackage済みVSIX Electron Playwrightへ統一する。
- required statusは今回設定しない。
- Mochaを維持し、Vitest comparisonは今回行わない。

このプロジェクトでは、テストを「仕様を守るための安全網」として扱う。

## 基本方針

- テストは内部実装ではなく、外から見た振る舞いに対して書く。
- 何をテストしているか分からないテストを書かない。
- mock を使う場合は、何を mock していて、何をテスト対象から外しているかを明記する。
- 期待する挙動を実装前に決め、必要な回帰テストを先に追加または更新する。
- テスト追加と最小実装は同じtaskで行ってよい。可能なら論理的にcommitを分ける。
- taskはテストと実装の種類ではなく、目的の違いで分割する。
- AIには、期待値と確認方法を明示させてから作業させる。

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

画像/PDF変換テストでは、できるだけ実ファイルを読み込む経路を通す。主要な正常系については、固定fixtureを使うテストを既存方式へ追加して並存させるのではなく、同じ目的のプログラム生成・base64埋め込みテストから置き換える。

優先順位:

1. `test/fixtures/`などの固定fixtureをテスト中の一時workspaceへコピーし、そのコピーをcommandの入力にする
2. workspace操作を伴わない低レベルテストでは、固定fixtureを直接読み込む
3. 適切な固定fixtureがない場合は、既存fixtureを読み込んで一時ディレクトリへ必要な形式を生成する
4. どうしても必要な場合だけ、小さなbase64文字列などの埋め込みfixtureを使う

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

### 複雑な実fixtureを正本にする

主要な変換・PDF操作の正常系では、テスト内で単純なPDFや画像を毎回生成するだけでなく、`test/fixtures/`へ固定した実fixtureを正本として使う。

- fixtureはテスト中に直接変更しない
- workspace操作を伴うテストでは、fixtureを一時workspaceへコピーしてからcommandを実行する
- テストごとに一時workspaceを分離し、出力やSafe Modeの状態を他のテストへ残さない
- fixtureには用途が分かる名前を付け、作成元、ライセンス、意図した特徴を近くのREADMEへ記録する
- 個人情報、機密情報、不要に大きなファイルをfixtureへ含めない
- fixtureの見た目や内容を変更した場合は、その変更理由と影響する期待値を確認する

プログラム生成fixtureは廃止しない。座標や色を厳密に制御した小さな単体テストには適している。一方、主要な正常系、複雑なfont・vector・rasterの混在、実ファイル読み込み、OS差の検出には固定fixtureを優先する。

固定fixture方式への移行は、機能ごとに既存テストを置き換える形で行う。

- 置換前に、既存テストが守っている入力形式、設定、出力、エラー、Safe Mode、Undo、cancelなどの観点を確認する
- 同じ目的のテストを固定fixture版へ移し、旧方式のテストは削除または縮小する
- 新旧テストを同じ目的で恒久的に並存させない
- 境界値を厳密に作る単体テストや、固定fixtureでは再現しづらい異常系は、目的が異なるため残してよい
- fixtureへの置換を理由に、対応形式やOS固有pathなど既存の検証範囲を狭めない

fixtureが未提供の段階では、AIが代替fixtureを勝手に正本化しない。必要なページ構成、画像形式、文字、数式、透明度、目印などを先に整理し、ユーザーへfixture提供を依頼する。

### fixtureに含めたい特徴

PDF操作用fixtureは、少なくとも次を見分けられる内容にする。

- 複数ページ
- 日本語とLatin文字
- 数式または細いvector線
- raster画像
- ページ端に近い位置の目印
- 上下左右を判別できる非対称な配置
- 必要ならページごとに異なるsizeまたはorientation

画像変換用fixtureは、対象機能に応じて次を含める。

- 上下左右を判別できる目印
- 細い線と小さい文字
- gradientまたは写真に近い連続色
- PNGでは透明領域と半透明領域
- JPEG/WebP/AVIFでは圧縮差を観察できるdetail

## 変換結果の内容検証

ファイルが開けること、page count、width、heightだけでは内容の位置ずれを検出できない。重要な変換では、必要な強さに応じて次の順で検証する。

1. 出力を対象形式として読み込める
2. page count、width、height、orientationが期待どおりである
3. 非空領域のbounding box、四隅の目印、主要領域の色などが期待位置にある
4. 位置ずれのriskが高い処理では、PDFを一定条件でrasterizeし、期待画像と実出力画像を比較する

PDF cropでは、同じ入力PDFを同じ解像度でrasterizeし、crop boxから作った期待領域と、出力PDFをrasterizeした画像を比較する。PDF binaryそのものはmetadataやobject順で変わり得るため、binary完全一致を正常系の基準にしない。

画像比較では、完全一致だけに依存しない。外部rendererやOSによるanti-alias差があり得る場合は、次を組み合わせる。

- widthとheight
- 非透明・非背景領域のbounding box
- 主要な目印の座標
- pixel差分率または平均差分

許容値は「テストを通すため」に広げず、fixtureとrendererを固定した上で実測して決める。差分発生時に確認できるよう、期待画像、実画像、差分画像をCI artifactとして残す。

## WebviewとVS Code integration testの役割

Webviewの実操作とvisual testでは、実VS Codeが提供する`--vscode-*` CSS変数と`vscode-dark` / `vscode-light`などの`body` classを含む環境を正本にする。Browser Playwrightは使わず、配布済みVSIXの実WebviewをElectron Playwrightで確認する。

### vscode-test

- command登録と`vscode.commands.executeCommand`
- settings、workspace、globalState
- Safe Mode、notification、progress、cancellation
- Host側のfile operationと実際の出力ファイル
- 外部tool path設定とerror handling
- pure logic、protocol、validation、状態変換

### Playwright Electron

Playwright Electronは、直前にpackageして隔離したextensions directoryへinstallしたVSIXだけを実VS Code windowで操作する。source directoryをExtension Development Hostとして読み込まず、Linux、macOS、Windowsで実行する。固定sleepを使わず、DOM状態、theme class、computed style、file変更検知などの成立条件を待つ。

E2EはCrop PDF ConfigureのWebview、Host message bridge、runtime asset、packageされたnative dependencyを必要とする重要な利用経路を扱う。screenshotはUI regression向けであり、出力fileの内容検証を代替しない。

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
