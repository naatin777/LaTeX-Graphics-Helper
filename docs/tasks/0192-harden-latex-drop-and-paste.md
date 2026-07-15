# LaTeX Drop/Pasteの入力仕様を明確化する

## Status

Todo

## Change Contract

### Problem

URI-list、workspace外PDF、単一PDFのalignment、snippet builderの重複について仕様と実装の一貫性を再確認する。

### Allowed behaviors

- B-001: URI-listの空行/comment/non-file URI/parse error/重複/case-insensitive PDFを決定的に扱う。
- B-002: 非対応入力の混在時のprovider辞退または拒否をspecで明記する。
- B-003: 単一PDFも設定済みalignmentを使う。
- B-004: workspace外はlocal file、relative path、未保存document、Windows drive/UNC、remote workspaceの挙動をspec化する。
- B-005: LatexSnippetの同一private methodを一つにする。

### Unresolved

- 非対応URI混在時のpartial処理可否は、既存provider契約とテストを照合して決める。

### Affected boundaries

VS Code DocumentDrop/Paste provider、URI parser、LaTeX snippet生成。

### Allowed files

- `src/edit_provider/latex_drop_edit_provider.ts`
- `src/edit_provider/latex_paste_edit_provider.ts`
- `src/edit_provider/latex_snippet.ts`
- `test/latex_drop_edit_provider.test.ts`
- `test/latex_paste_edit_provider.test.ts`
- `docs/specs/*.md` (LaTeX insertion/drop related only)
- `docs/tasks/0192-harden-latex-drop-and-paste.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification      | Evidence type          |
| -------- | ------------------------ | ---------------------- |
| B-001    | URI-list matrix tests    | provider test          |
| B-002    | mixed input test         | provider/spec test     |
| B-003    | alignment setting test   | snippet/provider test  |
| B-004    | path matrix/spec review  | provider test and spec |
| B-005    | snippet regression suite | unit test              |

### Dependencies

- Blocked by: 0189
- Blocks: 0195
- Can run in parallel with: 0190, 0191, 0193

### Not changing

- conversion safety implementation
- Webview protocol
- new LaTeX builder framework

## Completion criteria

- closed-worldで曖昧な入力挙動が残っていない。
- providerの実挙動とsnippet/spec/testが一致する。
- 実測verificationを記録する。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
