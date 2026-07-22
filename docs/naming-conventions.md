# Naming Conventions

命名は見た目ではなく、初見の読者が責務、入力、結果、public/internal境界を予測できることを目的にする。

| Surface                      | 文法                                        | Case                                        | 良い例                                                                | 悪い例                                                                  | 判断                                                                        |
| ---------------------------- | ------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| directory                    | domainまたはcapabilityの名詞                | 複数語は`snake_case`                        | `external_tools/`、`edit_provider/`                                   | `utils/`、`misc/`、`new_stuff/`                                         | 既存の`application/`、`operations/`は依存境界が確定するまで移動しない       |
| TypeScript file              | 主要exportまたは主要責務                    | 複数語は`snake_case`                        | `convert_to_pdf.ts`、`run_staged_conversion_batch.ts`                 | `convertPngToPdf.ts`、`helpers.ts`                                      | file名は最も広い実責務を表す。legacy名を理由にcanonical fileを狭くしない    |
| exported function            | 動作を表す動詞 + 対象 + 結果                | `lowerCamelCase`                            | `convertToPdfFiles`、`combineImagesToPdf`                             | `pdfHelper`、`processPdf`                                               | export名だけで入力と結果が読めるようにする                                  |
| local function               | 動作を表す動詞から開始                      | `lowerCamelCase`                            | `resolveOutputPath`、`createJob`                                      | `jobThing`、`doIt`                                                      | 短いscopeで役割が明確ならrepository全体で一意化しない                       |
| type / interface             | 責務、データ、結果を表す名詞                | `UpperCamelCase`                            | `PreparedConversionOutput`、`SplitPdfPageGroupsJob`                   | `Data`、`HelperOptions`                                                 | `manager`、`processor`など広い語を避ける                                    |
| module-level shared constant | 意味が固定された共有値                      | `CONSTANT_CASE`                             | `CONVERSION_CONCURRENCY`                                              | `defaultPath`、`conversionConcurrency`                                  | local定数は通常の`lowerCamelCase`でよい                                     |
| command entrypoint           | public/internal commandの動作 + `Command`   | `lowerCamelCase`                            | `convertToPdfCommand`、`cropPdfAutoCommand`                           | `convertToPdf`、`cropPdfAuto`                                           | command登録入口だけにsuffixを付ける。operationは`Command`にしない           |
| command ID                   | extension namespace + capability + mode     | 既存形式の`lowerCamelCase`/dot              | `latex-graphics-helper.splitPdf.allPages`                             | `latex-graphics-helper.convertPngToPdf`をgeneric PDFのcanonical名にする | public IDは互換性のため既存名を維持し、canonical internal symbolと分ける    |
| config key                   | 設定domain + semantic setting               | `lowerCamelCase`/dot                        | `outputPath.convertToPdf`、`mermaid.puppeteer.browserChannel`         | `outputPath.convertPngToPdf`を全入力の標準名にする                      | workspace/userに保存されるkeyはlegacy aliasを先に決めず削除しない           |
| output template              | 出力の対象と粒度を示す                      | `outputPath.<format>`またはlegacy pair      | `outputPath.convertToPdf`、`outputPath.convertPdfToPng`               | `outputPath.result`                                                     | pair-specific keyはTask 0098のmigration判断までfallbackとして残す           |
| NLS key                      | UIのdomain + message role                   | `lowerCamelCase`/dot                        | `message.progress.convertToPdf.title`                                 | `text1`、内部logger用key                                                | NLS keyはuser-facing surface。legacy command IDと同じ名前でも用途を記録する |
| test file                    | 被検証module/capability + optional contract | `snake_case.test.ts`                        | `convert_to_pdf_command.test.ts`、`split_pdf_page_groups.test.ts`     | `misc.test.ts`、`test_conversion.ts`                                    | filenameはtest対象を示し、suite名と同じ語彙を使う                           |
| test suite                   | 対象domainまたはobservable contract         | ADR-0011に従い日本語                        | `PDF全ページ分割`、`外部tool実行ファイルの設定`                       | `Split PDF page groups`と日本語suiteの混在                              | 既存suiteはbehavior固定のため無理に全履歴を改名しない                       |
| docs file                    | document role + topic                       | 英語の`kebab-case`                          | `naming-conventions.md`、`output-format-conversion.md`                | `notes.md`、日付だけの仕様file                                          | `docs/specs/`、`docs/adr/`は既存の役割に従う                                |
| legacy alias                 | 旧surfaceを意味する固定語 + 対象            | `legacy`または`compatibility`を説明文で使う | `legacy outputPath.convertPngToPdf`、`convertPngToPdfInternalCommand` | 新しいformal API名に`direct`、`normal`、`new`を使う                     | 互換性の説明では`legacy`を使ってよいが、新機能の曖昧な相対名には使わない    |

## Directory layout

`src/`は責務境界の下に、複数の関連moduleを持つ領域だけを分割する。

```text
src/
  application/{policy,protocols}/
  commands/{conversion,pdf,lifecycle,shared}/
  config/{output,rendering,external_tools}/
  operations/{conversion,pdf,lifecycle,input,external_tools}/
  edit_provider/
  presentation/webview/
  security/

test/
  {application,commands,config,edit_provider,operations,presentation,security,integration}/
  fixtures/
  helpers/
  playwright/electron/
```

`security/`と`presentation/webview/`は現在1責務・1moduleのため、空の下位directoryを作らない。`fixtures/`、`helpers/`、`playwright/electron/`はsource責務ではなくtest runtime資産として分離する。

## Naming and compatibility

1. public command ID、user setting key、output template semantics、NLS keyはpublic surfaceである。
2. public surfaceのcanonical名を変更する場合は、先に新旧対応表、alias/fallback、deprecated案内、双方のtest、削除条件を決める。
3. internal symbolとfile名はbehaviorを変えずに先にcanonical語彙へ寄せる。ただし、compiled moduleを外部からimportする利用実態が判明した場合はaliasを残す。
4. staging directoryのoperation labelはcleanup、Undo、recoveryのpath契約に含まれるため、source fileの改名と同時に変更しない。
5. `convert`、`combine`、`merge`は、入力数と出力数が異なるため代用しない。
