# 変換入力preflightの内部契約

## 目的

変換操作を開始する前に全入力を検査し、明らかに処理できない入力で変換や出力commitを開始しない。preflightは入力ファイルを変更しない。

## 原則

- 全入力を先に検査し、1件でも`error`があればbatch全体を開始しない。
- 検査結果は入力pathと対応付ける。
- file size、pixel count、page countを、根拠のない固定値だけで拒否しない。
- resource不足やtoolの限界は、実parser・renderer・外部toolが返した具体的な失敗として扱う。
- 将来resource制限が必要になった場合は、再現Evidence、利用者への影響、設定または明示的な回避方法を伴う独立判断とする。
- 形式判定は拡張子だけで完了せず、可能な範囲でheader・metadata・構造を確認する。
- preflightを通過しても、生成物はcommit前に出力形式として再検証する。

## 結果

| 結果      | 意味                                                   | 後続処理                                              |
| --------- | ------------------------------------------------------ | ----------------------------------------------------- |
| `ok`      | 軽量検査で変換不能な問題を確認しなかった               | 変換を開始する                                        |
| `warning` | 変換できるが一部情報を失う、または内容の確証が弱い     | 現行実装では記録して続行。確認UIはTask 0204で実装予定 |
| `error`   | 読取不能、空、非regular file、破損、未対応など          | batch全体を停止する                                   |

`error`は`warning`より優先する。複数errorは入力path付きで診断できなければならない。

## 共通検査

すべての入力で次を確認する。

| ID | 検査                                      | 失敗時 |
| -- | ----------------------------------------- | ------ |
| C1 | 対応するsource formatとして判定できる     | error  |
| C2 | fileが存在し、statとreadが可能             | error  |
| C3 | regular fileである                         | error  |
| C4 | 0 byteではない                             | error  |
| C5 | operation側のworkspace境界検査を通過する   | error  |

C5は各operationの`assertExistingPathInWorkspace`と`assertWritablePathInWorkspace`が担当する。preflight単体でworkspace policyを複製しない。

## 形式別の現行軽量検査

### PDF

- 先頭5 byteが`%PDF-`であることを確認する。
- page parse、暗号化、page boxの検査は現時点では変換operation側が担当する。
- PDF出力はcommit前に`pdf-lib`でparseし、1page以上と有限・正寸法のpage boxを確認する。

### Raster画像

対象: PNG、JPEG、WebP、AVIF、GIF、TIFF。

- Sharpでmetadataを取得できること。
- widthとheightが正であること。
- multi-page / animated入力で先頭pageだけを処理する場合は`warning`にする。
- pixel countだけを理由にwarningまたはerrorへしない。

WindowsではSharpへpathを直接渡した後にfile handleが残る回帰があったため、現行preflightはBufferからmetadataを取得する。この挙動はfile-handle testで保護する。

### SVG

- UTF-8 textとして読め、空でないこと。
- `<svg` rootが見つからない場合は`warning`。
- `viewBox`もwidth/heightも確認できない場合は`warning`。
- XML parserによる構造検査はTask 0204の残作業。

### Mermaid

- UTF-8 textとして読め、空でないこと。
- CLI syntax検査はTask 0204の残作業。

### Draw.io

- native `.drawio` / `.dio`はtextとして読め、空でないこと。
- `mxfile`または`mxGraphModel`が見つからない場合は`warning`。
- editable `.drawio.png` / `.drawio.svg`はbinary内容をUTF-8 textへ変換しない。埋込みdiagramの実在確認はDraw.io変換経路が担当する。

### EPS

- 先頭領域にPostScript headerと`%%BoundingBox`があること。
- BoundingBoxが4整数で、lower-leftよりupper-rightが大きいこと。
- `%%BoundingBox: (atend)`は生成PDFで確定するため`warning`。
- BoundingBoxの大きさだけを固定上限で拒否しない。

## Batch flow

```text
command
  ├─ operation固有のjob/path validation
  ├─ preflightを入力順で実行（同時実行数2）
  │   ├─ errorあり    → path付きerrorで停止
  │   ├─ warningのみ  → Output channelへ記録し続行（確認UIは未実装）
  │   └─ 全件ok       → 続行
  ├─ stagingへ変換
  ├─ 生成形式を検証
  └─ conflict判断後にcommit
```

同時実行数2はfile受入上限ではなく、複数validatorが同時にnative libraryやfilesystemへ負荷を掛けることを避けるbatch schedulingである。

## Cancellation

- 開始時にcancel済みならvalidatorを起動しない。
- cancel後はqueue済みvalidatorを開始しない。
- 実行中validatorが返った後にもsignalを再確認する。
- cancel時は変換を開始しない。

validator自体が同期的なnative処理を中断できない場合でも、結果を採用せず後続変換を開始しない。

## Output channel

各入力について最低限次を記録する。

```text
[preflight] <source path>: <ok|warning|error> — <reason>
```

operationがOutput channelを持つ場合、preflightへ同じchannelを渡す。ユーザー向けerrorには失敗した入力pathを含める。

## 生成物検証との境界

preflightは入力の軽量検査であり、外部toolのexit code 0を成果物の正しさとはみなさない。

- PDFはparse可能、1page以上、page boxが有限かつ正寸法であること。
- SVGは空でなく、SVG rootを含むこと。
- rasterはSharp encoder / decoderが成功すること。
- commit前検証に失敗した場合、final outputを反映しない。

## 未実装

Task 0204で次を扱う。

- warning一覧と続行/取消の1回確認
- preflight progressの外部表示
- PDFの構造・暗号化・page boxの入力側詳細検査
- SVGのXML構造検査
- Mermaid / Draw.io CLIを利用できる場合の詳細検査
- format固有detailsの一貫したOutput channel表示

## 対象外

- 入力fileの自動修復
- password入力UI
- 拡張子の自動変更
- 壊れた内容を別formatとして推測して処理すること
- Evidenceなしの固定resource上限

## 関連

- [出力形式基準の変換仕様](output-format-conversion.md)
- [ファイル操作security仕様](file-operation-security.md)
- [EPS変換の内部契約](eps-conversion.md)
- [Task 0204](../../tasks/0204-complete-input-preflight-implementation.md)
