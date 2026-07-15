# Clipboard Pasteのcancellationとcleanupを統合する

## Status

Todo

## Change Contract

### Problem

Clipboard Pasteのstaging、変換、commit、Undo記録、cleanupが一つのartifact lifecycleになっておらず、CancellationTokenが実処理へ伝播しない可能性がある。

### Allowed behaviors

- B-001: staging後のwrite失敗、変換失敗、commit失敗、cancelで今回のrootだけをcleanupする。
- B-002: 変換開始前またはcommit前のcancelでは最終出力を作らない。
- B-003: conflict dialog待機中のcancelを扱う。
- B-004: Undo記録失敗はPaste全体を失敗にせず、ログを残しsnippet生成を継続する。
- B-005: Keep Both後の実pathをsnippetへ使う。
- B-006: 既存出力を壊さず、cleanup失敗をOutput Channelへ記録する。

### Unresolved

- commit完了後にeditor側tokenがcancelされた場合は、既にcommit済みの出力を保持しsnippetは返す方針をspecへ明記する。

### Affected boundaries

Clipboard data、CancellationToken、staging、conversion、commit、Undo、LaTeX snippet。

### Allowed files

- `src/edit_provider/latex_paste_edit_provider.ts`
- `src/commands/undo_last_conversion.ts`
- `src/operations/convert_png_to_pdf.ts`
- `test/latex_paste_edit_provider.test.ts`
- `test/undo_last_conversion.test.ts`
- `docs/specs/conversion-progress-and-cancellation.md`
- `docs/specs/undo-last-conversion.md`
- `docs/tasks/0187-harden-clipboard-paste-lifecycle.md`
- `docs/tasks/README.md`

### Evidence matrix

| Behavior | Test / verification                           | Evidence type             |
| -------- | --------------------------------------------- | ------------------------- |
| B-001    | injected write/convert/commit failure tests   | filesystem lifecycle test |
| B-002    | pre-convert and pre-commit cancellation tests | provider test             |
| B-003    | conflict cancellation test                    | provider test             |
| B-004    | Undo failure test                             | observable provider test  |
| B-005    | Keep Both snippet path test                   | provider test             |
| B-006    | existing output and cleanup log assertions    | filesystem/log test       |

### Dependencies

- Blocked by: 0185, 0186
- Blocks: 0189
- Can run in parallel with: none

### Not changing

- generic conversion/raster refactor
- Webview behavior
- new cancellation framework

## Completion criteria

- Paste全体が一つのcleanup境界で保護される。
- tokenが変換・commit境界まで伝播する。
- 必須回帰テストを実測で通す。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
