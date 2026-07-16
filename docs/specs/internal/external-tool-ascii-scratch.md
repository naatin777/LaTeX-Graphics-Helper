# 外部コマンド用ASCII scratch仕様

## 目的

WindowsでUnicode pathを正しく扱えない外部コマンドへ、ASCIIだけで構成された一時入出力pathを渡す。Unicodeを含むworkspace、入力file名、outputPathはユーザー向けの論理pathとして維持する。

## 用語

- 論理入力: ユーザーが選択したworkspace内の入力path
- 論理出力: outputPath設定から解決したユーザー向けpath
- transaction staging: Safe Modeで反映する前のworkspace内完成fileとbackup
- tool scratch: 外部コマンドへ直接渡すOS一時directory内の入出力

tool scratchはtransaction stagingの代わりではない。

## 対象

タスク0141の実測結果に基づき、Windowsで次だけを対象にする。

| Tool         | scratch入力 | scratch出力      | 理由                                                                                     |
| ------------ | ----------- | ---------------- | ---------------------------------------------------------------------------------------- |
| Ghostscript  | 必須        | 現行cropではなし | Hindi・emojiを含む入力pathで失敗した                                                     |
| pdftocairo   | 必須        | 必須             | Unicode入力は実測上成功したが、toolへ渡すpathを一律に隔離し、Unicode出力の文字化けを防ぐ |
| rsvg-convert | 必須        | 必須             | 調査した非ASCII入出力pathで失敗した                                                      |

次には適用しない。

- LinuxとmacOS
- Draw.io
- qpdf
- pdf-lib、sharp、Node.js file APIなどprocess内処理
- PuppeteerとMermaid CLI

対象追加は推測で行わず、実体probeの結果を別タスクで記録してから決める。

## scratch baseの選択

Windowsでは次の順で候補を評価する。

1. `os.tmpdir()`
2. `SystemRoot`環境変数が指すdirectory内の`Temp`

候補は次をすべて満たす必要がある。

- absolute pathである
- `realpath`解決後のpathがASCIIだけで構成される
- 既存directoryである
- `mkdtemp`で子directoryを作成できる

1つ目がUnicode pathまたは書き込み不可なら2つ目を試す。両方使えない場合は、入力copyや外部コマンド実行を始めず、ASCIIの一時作業領域を作成できないことを通知する。

scratch baseをsettings.jsonから指定させない。任意のworkspace外pathを外部入力にすると、workspace境界の例外が広がるためである。

## directoryとfile名

command実行ごとに、次のような専用rootを`mkdtemp`で作る。

```text
<ascii-temp-base>/latex-graphics-helper-<random>/
├ input.pdf
├ input.svg
├ output.pdf
├ output.png
└ output.svg
```

実際には対象toolが必要とするfileだけを作る。

- prefix、random部分、file名、拡張子はASCIIに限定する
- workspace名、元file名、outputPath、`runId`をscratch名へ含めない
- 同一batch内でもtool実行ごとに別rootを使い、並列実行時の衝突を避ける
- pdftocairoへはscratch内の`output`をprefixとして渡し、期待する拡張子付きfileを検証する

## path境界

workspace外操作を一般解禁しない。

tool scratchに対しては、workspace境界検証とは別に次を検証する。

1. scratch rootは選択済みscratch baseの実体内にある
2. 入出力pathはscratch rootの論理pathと実体pathの両方に含まれる
3. scratch rootと入出力の既存部分にsymlinkを含めない
4. 外部コマンドへ渡す入出力absolute pathがASCIIである

許可するworkspace外操作は次だけとする。

- workspace入力からscratch入力への`copyFile`
- scratch出力の検証と読み取り
- scratch出力からworkspace内transaction stagingへの`copyFile`
- scratch rootの削除

論理入力と論理出力は従来どおりworkspace境界を満たす必要がある。

## 処理順序

1. batch全体の論理入力、論理出力、workspace境界を検証する
2. scratch rootを作成してASCII・境界・symlinkを検証する
3. `AbortSignal`を確認する
4. Node.js `copyFile`で論理入力を固定ASCII名へcopyする
5. copy後に`AbortSignal`を確認する
6. 外部コマンドを実行fileと引数配列に分けて起動する
7. command終了後に`AbortSignal`を確認する
8. fileを出力するtoolでは、期待するexact pathがregular fileとして存在し、sizeが1 byte以上であることを確認する
9. Node.js `copyFile`でworkspace内transaction stagingへcopyする
10. transaction stagingを再検証する
11. 成功したscratch rootを削除する
12. batch内の全変換成功後にSafe Modeの通常フローで論理出力へ反映する

separatorはNode.js `path`が生成したnative形式をそのまま引数として渡す。Windowsで`\\`を`/`へ一律変換しない。

## 成功判定

外部コマンドがfileを出力する場合、次をすべて満たして成功とする。

- processがexit code 0で終了した
- 期待したexact pathにfileがある
- symlinkではなくregular fileである
- sizeが1 byte以上である

別名file、0 byte file、途中fileは成功扱いしない。期待外のfileはscratch内に残してよいが、transaction stagingや論理出力へcopyしない。

PDF・画像として内容が妥当かを検証するpreflightは[変換入力preflightタスク](../../tasks/0128-design-input-preflight-validation.md)で別に決める。

## Safe ModeとUndo

- Safe Modeの競合判断は論理出力に対して行う
- `PreparedConversionOutput.stagedOutputPath`はworkspace内transaction stagingを指す
- 上書き前backupはworkspace内に置く
- Undoには論理出力とworkspace内backupだけを記録する
- tool scratchとscratch内fileはUndo対象にしない
- scratch cleanup失敗を理由に、反映済み論理出力をUndo以外の方法で戻さない

## 複数入力と失敗

- 既存の`p-limit`による並列数を変更しない
- tool実行ごとにscratch rootを分ける
- 1件でも失敗した場合、batch全体を論理出力へ反映しない
- 成功済みjobのworkspace内transaction stagingは既存方針どおり残してよい
- 失敗したscratchと期待外fileは診断用に残す

## cancel

- scratch作成、copy、外部コマンド、workspace側copyの前後で`AbortSignal`を確認する
- 外部コマンドには既存どおり`AbortSignal`を渡して終了させる
- cancel後はtransaction stagingと論理出力へ新たにcopyしない
- cancel時のscratchは診断用に残す

## cleanup

- 成功したtool実行のscratchはworkspace側copy完了後に削除する
- 削除失敗はOutput channelへwarningとscratch pathを記録し、変換結果自体は失敗にしない
- 失敗・cancel時のscratchは自動削除しない
- OSによる一時file cleanupで後から消えることは許容する
- extension起動時に過去scratchを一括削除する機能は初期実装に含めない

## ログとエラー

ユーザー通知では論理入力・論理出力を使い、scratch pathを変換結果として表示しない。

Output channelへmappingを出す場合は、意味を明示する。

```text
[scratch] logical input: <workspace path>
[scratch] tool input: <temporary ASCII path>
[scratch] tool output: <temporary ASCII path>
[scratch] staged output: <workspace staging path>
```

- command全体をshell用文字列として再構築しない
- file内容をログへ出さない
- 失敗・cancel時は診断用scratch pathを記録する
- scratch作成不能時は試した実pathをすべてユーザー通知へ出さず、Output channelだけへ記録する

## テスト計画

### 共通scratch helper

- scratch base候補の優先順位
- Unicodeの`os.tmpdir()`を拒否してASCIIのsystem tempへfallbackする
- 両候補が使えない場合はfile copy前に失敗する
- `mkdtemp`で実行ごとに異なるrootを作る
- scratch root外、symlink、非ASCII pathを拒否する
- 成功時だけcleanupし、失敗・cancel時は残す
- cleanup失敗はwarningにする

platform、temp候補、file APIはテストから注入できるようにし、macOSやLinuxでもWindows分岐をテストする。

### Ghostscript

- 論理入力がUnicodeでもtool引数は`input.pdf`のASCII absolute pathになる
- bbox取得成功後にscratchを削除する
- non-zero exitとcancelではscratchを残す

### pdftocairo

- Unicodeの論理入力と論理出力でもtool引数はscratchの`input.pdf`と`output`になる
- 期待拡張子の別名、missing、0 byteを失敗にする
- 有効なscratch出力だけをworkspace内transaction stagingへcopyする
- PNG、JPEG、WebP、AVIF、SVGの各routeで同じ規則を使う

### rsvg-convert

- Unicodeの論理SVGを`input.svg`へcopyする
- `output.pdf`だけをworkspace側へcopyする
- exit 0かつ0 byte、別名出力、missingを失敗にする
- Puppeteer engineには適用しない

### batch・Safe Mode・Undo

- 複数jobのscratchが衝突しない
- 1件失敗時に論理出力へ何も反映しない
- Safe Modeの選択肢と競合pathが変わらない
- Undo記録にscratch pathを含めない
- cancel後に論理出力へ反映しない

## 関連

- [ADR-0012](../../adr/0012-use-os-temp-for-incompatible-windows-tools.md)
- [workspace境界仕様](file-operation-security.md)
- [Safe Mode仕様](safe-mode.md)
- [直前変換取消仕様](undo-last-conversion.md)
- [進捗・cancel仕様](conversion-progress-and-cancellation.md)
- [OS別path互換性調査](../../research/2026-07-11-external-tool-path-compatibility.md)
