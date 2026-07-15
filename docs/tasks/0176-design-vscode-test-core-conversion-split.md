# タスク: VS Code testのcore / conversion分割を設計する

## Status

Done

## 目的

VS Code integration testをcoreとconversionに分け、外部tool setupを必要なtestだけに寄せるための設計を決める。

## 完了条件

- 現在のVS Code test fileをcore / conversion / mixedへ分類している
- mixed testをどう分けるか決めている
- `test:vscode:core` と `test:vscode:conversion` の役割を決めている
- 3 OSが必要なtestとLinuxだけでよいtestを分けている
- external tool setupが必要なtestを明記している
- 実装を小さな後続タスクへ分けている

## 変更可能なファイル

- `docs/tasks/0176-design-vscode-test-core-conversion-split.md`
- 必要な `docs/research/`
- `docs/tasks/README.md`

## 対象外

- test fileの移動
- package script変更
- workflow変更

## 関連

- [0161: 変更影響に応じたCI scopeを設計する](0161-design-change-based-ci-scope.md)

## 確認方法

- 現在のtest file一覧を分類表へ当てはめる
- `git diff --check`

## 現在の実行単位

現在の`.vscode-test.mjs`は`out/test/**/*.test.js`を1回のExtension Hostで読み込む。`package.json`の`test:vscode`はbuild後にこの全testを実行し、Test workflowは同じ実行をLinux、macOS、Windowsで繰り返している。

このタスクでは、test fileを移動・編集せず、実行対象の設計だけを決める。分類は「テストの責務」と「実行時に外部変換toolが必要か」を分けて考える。

## 分類基準

### core

extensionの状態管理、設定、path境界、Safe Mode、Undo、manifest、Webview HTMLなどを検証するtest。外部のPDF・画像変換実行ファイルを起動しない。

### conversion

PDF・画像・Draw.ioの変換処理そのものを検証するtest。runnerをinjectする処理テスト、`pdf-lib` / `sharp`だけで完結する処理、ASCII scratchやcropの境界テストを含む。外部実行ファイルをmockしているtestはこの分類だが、tool installは必要ない。

### mixed

VS Code command / extension activationと実際の変換、または実際の外部toolを同じtestで検証するtest。最初の分割ではconversion側へ置き、core側との重複実行はしない。ファイル内にcoreとconversionのtestが混在していても、ファイル単位ではmixedとして安全側に倒す。

## 現在の36 test fileの分類

### core（15 file）

- `ci_scope_classifier.test.ts`
- `ci_scope_classifier_boundary.test.ts`
- `commit_conversion_outputs.test.ts`
- `crop_pdf_output_path_validation.test.ts`
- `latex_drop_edit_provider.test.ts`
- `latex_paste_edit_provider.test.ts`
- `package_manifest.test.ts`
- `resolve_output_path.test.ts`
- `safe_mode.test.ts`
- `safe_mode_dialog.test.ts`
- `safe_mode_status_bar.test.ts`
- `stop_fix_hook.test.ts`
- `undo_last_conversion.test.ts`
- `webview_html.test.ts`
- `workspace_path.test.ts`

### conversion（12 file）

- `convert_pdftocairo_ascii_scratch.test.ts`
- `convert_png_to_pdf.test.ts`
- `convert_rsvg_ascii_scratch.test.ts`
- `convert_to_avif_operation.test.ts`
- `convert_to_png_drawio_route.test.ts`
- `convert_to_png_operation.test.ts`
- `convert_to_svg_operation.test.ts`
- `convert_to_webp_operation.test.ts`
- `crop_pdf_auto.test.ts`
- `crop_pdf_ghostscript_ascii_scratch.test.ts`
- `png_safe_mode.test.ts`
- `split_pdf_all_pages.test.ts`

### mixed（9 file）

- `convert_to_avif_command.test.ts`
- `convert_to_jpeg_command.test.ts`
- `convert_to_pdf_command.test.ts`
- `convert_to_png_command.test.ts`
- `convert_to_svg_command.test.ts`
- `convert_to_webp_command.test.ts`
- `crop_pdf_configure_operation.test.ts`
- `extension.test.ts`
- `merge_pdf_command.test.ts`

各fileは1つの分類にだけ属する。`extension.test.ts`は登録確認だけでなく実際のPNG→PDF commandも含むため、最初からcoreとconversionの両方で実行しない。

## 外部toolの必要性

| 分類 / file                                  | 外部tool                                                 | 方針                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| core全体                                     | 画像・PDF変換toolなし                                    | `pnpm install`で入る依存だけを使い、Ghostscript、Poppler、rsvg-convert、qpdf、Draw.io、Mermaid browserを準備しない |
| conversionのrunner注入・bundled処理          | なし                                                     | `pdf-lib`、`sharp`、mock runnerで検証する。外部tool実体の検証とは混ぜない                                          |
| `convert_pdftocairo_ascii_scratch.test.ts`   | mock                                                     | pdftocairo実体は使わない。実体のUnicode/path確認は別のOS probeで行う                                               |
| `convert_rsvg_ascii_scratch.test.ts`         | mock                                                     | rsvg-convert実体は使わない。実体の確認は別のOS probeで行う                                                         |
| `crop_pdf_ghostscript_ascii_scratch.test.ts` | mock                                                     | Ghostscript実体は使わない。実体の確認は別のOS probeで行う                                                          |
| `convert_to_*_command.test.ts`               | 形式によりpdftocairo、rsvg-convert、Mermaid CLIのbrowser | conversion側で現在の3 OS tool setupを行う                                                                          |
| `crop_pdf_configure_operation.test.ts`       | pdftocairo                                               | fixtureの描画内容比較に使うためconversion側で準備する。crop本体はpdf-libで行う                                     |
| `merge_pdf_command.test.ts`                  | pdftocairo                                               | merge前後の描画比較に使うためconversion側で準備する                                                                |
| `extension.test.ts`                          | なし                                                     | PNG→PDFはpdf-lib経路なので、実行場所はmixedだが画像変換tool installは不要                                          |

qpdfは現在のVS Code test fileから直接要求されていない。外部toolの実体probeや将来のpreflight testで必要になった場合に、対象jobへ追加する。

## OSの方針

### 3 OSで実行するtest

次はOS差が結果に直接影響するため、Linux、macOS、Windowsで実行する。

- mixedの9 file。VS Code command、外部process、出力path、実ファイルの接続を確認する
- `convert_pdftocairo_ascii_scratch.test.ts`
- `convert_rsvg_ascii_scratch.test.ts`
- `crop_pdf_ghostscript_ascii_scratch.test.ts`
- `resolve_output_path.test.ts`
- `workspace_path.test.ts`
- `stop_fix_hook.test.ts`

ASCII scratch testはrunnerをmockしているが、Windows pathを含む境界契約とExtension Host上のfile操作を各OSで読み込むため3 OS対象とする。実行ファイルそのもののOS差は、既存のexternal-tool path probeで別に確認する。

### Linuxだけで開始するtest

次は外部processやOS固有pathを持たないため、初期実装ではLinuxだけで実行する。

- coreのうち上記3 OS対象でないfile
- `convert_png_to_pdf.test.ts`
- `convert_to_avif_operation.test.ts`
- `convert_to_png_drawio_route.test.ts`
- `convert_to_png_operation.test.ts`
- `convert_to_svg_operation.test.ts`
- `convert_to_webp_operation.test.ts`
- `crop_pdf_auto.test.ts`
- `png_safe_mode.test.ts`
- `split_pdf_all_pages.test.ts`

conversion scopeでは、classifierの既存contractに合わせてcore testも3 OSで実行する。これは変換変更が共通のcommand orchestrationやSafe Modeへ影響する可能性を残したまま、core側の外部tool installだけを削るためである。extension-core scopeではcore testをLinuxだけで実行する。

## `test:vscode:core` と `test:vscode:conversion`

### `test:vscode:core`

- core分類のfileを明示的なmanifestから実行する
- conversion scope、package/lockfile、CI変更では必要なOS matrixを選ぶ
- extension-core変更ではLinuxを基本にする
- 外部画像・PDF toolのinstall / verify stepを持たない
- `test:vscode:core`単独で成功した場合、conversion outputの生成成功を意味しない

### `test:vscode:conversion`

- conversion分類とmixed分類のfileを明示的なmanifestから実行する
- conversion、package/lockfile、CI変更では3 OSを対象にする
- OSごとに必要なpdftocairo、rsvg-convert、Ghostscript、qpdfなどを設定値経由で準備・verifyする
- Mermaidを実行するtestでは、既存のPuppeteer browser setupもこの側で行う
- mixed testをcore側へ重複して含めない

最初の実装ではconversion側のjobでtool setupを行う。runner mockだけで完結するconversion fileまで個別jobに分けるのは、分割後の時間を実測してから判断する。

## mixed testの扱い

初期実装で無理にtest case単位のgrepを使わない。grepはtest名変更やfixture追加で対象漏れを起こしやすく、現在のテスト方針にも合わない。

1. `extension.test.ts`は一旦mixed全体をconversion側で実行する
2. `convert_to_*_command.test.ts`は実際のcommand完了・出力検証を含むためconversion側に置く
3. `crop_pdf_configure_operation.test.ts`と`merge_pdf_command.test.ts`は実描画比較を含むためconversion側に置く
4. mixed fileをcoreとconversionへ分けるのは、test fileを責務別に編集する別タスクで行う
5. 同じtest fileを両方のmanifestで実行しない

## 後続タスクへの分割

実装は次の順番で小さく分ける。番号はタスク化時に採番する。

1. core / conversion / mixedのfile manifestと、選択manifestを受け取るVS Code test runnerを追加する
2. `test:vscode:core`を追加し、外部tool installなしでLinuxのcore testを通す
3. `test:vscode:conversion`を追加し、既存の3 OS外部tool setupとconversion/mixed testを通す
4. CI scope classifierの`vscodeCore` / `vscodeConversion` outputを2つのtest jobへ接続し、Test用固定gateを追加する
5. mixed fileを責務別に分割し、不要なtool setupとOS実行をさらに減らせるか実測する

各段階で、既存の`pnpm run test:vscode`相当の全testがどこかのmanifestに一度だけ含まれることを確認する。既存scriptは分割が安定するまで削除しない。

## 実施結果

- 現在の36 test fileをcore 15、conversion 12、mixed 9へ分類した
- mixedは最初からcoreへ重複させず、conversion側へ置く方針を決めた
- `test:vscode:core`は外部toolなし、`test:vscode:conversion`は外部toolと3 OSを担当する方針を決めた
- ASCII scratch、path、shell hookを3 OS対象とし、純粋なpolicy・mocked operationをLinux開始対象とした
- classifierの既存`vscodeCore` / `vscodeConversion` targetと矛盾しないOS方針を決めた
- 実装をmanifest、core runner、conversion runner、CI接続、mixed分割の後続タスクへ分けた
- このタスクではtest file、package script、workflowを変更していない
