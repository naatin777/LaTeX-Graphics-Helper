# LaTeX Drop/Pasteの入力仕様を明確化する

## Status

In Progress

## Change Contract

### Problem

LaTeXへのPDF dropがURI-listのコメント、重複、非file URI、壊れたURI、非PDF入力を区別せず一部処理する。単一PDFのalignmentが設定を使わず、snippet builderにも同一実装が重複している。

### Allowed behaviors

- B-001: `text/uri-list`の空行と`#`コメントを無視し、file URIを安全にparseする。
- B-002: URI parse失敗、非file URI、非PDF URIを1件でも含むURI-listではprovider全体を辞退し、部分的なsnippetを返さない。
- B-003: 大文字小文字非依存でPDFを判定し、重複file URIは最初の1件だけ処理する。
- B-004: local fileのPDFをdocumentからのrelative pathへ変換する。workspace外の同一filesystem rootは許可し、異なるdrive・UNC rootなどrelative pathにならない場合は辞退する。
- B-005: 未保存document、remote document、cancellation時はsnippetを返さない。
- B-006: 単一PDFでも`figure.alignmentOptions`を使い、Clipboard Pasteとalignment挙動を揃える。
- B-007: `LatexSnippet`の同一option append実装を1つへ統合する。

### Unresolved

- WindowsのUNC pathで同一rootをrelative pathへ変換できるかはWindows CIで追加確認する。

### Affected boundaries

LaTeX document drop provider、URI-list parsing、local/remote URI境界、relative path生成、LaTeX snippet builder。

### Allowed files

- `src/edit_provider/latex_drop_edit_provider.ts`
- `src/edit_provider/latex_snippet.ts`
- `test/latex_drop_edit_provider.test.ts`
- `test/latex_snippet.test.ts`
- `docs/specs/latex-insertion.md`
- `docs/tasks/0191-reduce-raster-operation-review-surface.md`
- `docs/tasks/0192-harden-latex-drop-and-paste.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification                            | Evidence type          |
| -------- | ---------------------------------------------- | ---------------------- |
| B-001    | URI-list parsing tests                         | behavior test          |
| B-002    | mixed/invalid URI-list tests                   | negative behavior test |
| B-003    | uppercase PDF and duplicate URI tests          | behavior test          |
| B-004    | external local PDF and non-relative path tests | path behavior test     |
| B-005    | unsaved/remote/cancellation tests              | boundary test          |
| B-006    | single PDF alignment test                      | snippet assertion      |
| B-007    | snippet option regression tests                | unit/regression test   |

### Dependencies

- Blocked by: 0187, 0191
- Blocks: 0193
- Can run in parallel with: 0194, 0195

### Not changing

- Clipboard image conversion lifecycle already completed in 0187.
- workspace write security and conversion output commit behavior.
- new LaTeX syntax or new insertion settings.
- partial processing of unsupported URI-list entries.

## 目的

Drop/Pasteの入力境界を仕様化し、ユーザーが意図しない部分処理や設定無視を起こさないようにする。

## 完了条件

- 仕様、実装、テストがURI-listとpath境界で一致する。
- 単一PDF、複数PDF、Clipboard Pasteのalignmentが同じ設定を使う。
- taskのVerification resultsを実測値で埋める。

## Completion criteria

- B-001からB-007のEvidence matrixが成功している。
- `pnpm run check:all`と対象integration testが成功している。

## Verification results

| Command                                                                                                                    | Result | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `pnpm run check:all`                                                                                                       | Passed | lint, format, runtime/test/Webview typecheck, RuleSync, task preflight, NLS           |
| `pnpm run build:test`                                                                                                      | Passed | TypeScript and Crop Webview production build                                          |
| `pnpm exec vscode-test --run out/test/latex_drop_edit_provider.test.js --run out/test/latex_snippet.test.js --forbid-only` | Passed | 7 tests covering URI-list, path boundary, cancellation, alignment, and option builder |
| `git diff --check`                                                                                                         | Passed | no whitespace errors                                                                  |

## 変更可能なファイル

- Change ContractのAllowed filesと同じ。

## 対象外

- Webview、CI/release、設定key移行。
- LaTeX snippet builder全体の再設計。

## 関連

- [LaTeX挿入仕様](../specs/latex-insertion.md)

## 確認方法

- URI-listの正常系、拒否系、重複、cancellationをVS Code integration testで確認する。
- snippetのalignment、relative path、placeholderを最終文字列で確認する。
