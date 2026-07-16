# 変換commandの共通境界を小さく整理する

## Status

Done

## Change Contract

### Problem

出力形式別commandにselection、progress、cancellation、Safe Mode、Undo、通知の同じ境界が重複し、形式差分のレビューが困難である。

### Allowed behaviors

- B-001: 共通command runnerはprogress・cancel・Undo・success/error通知の境界だけを担う。selectionとjob生成は形式別commandに残す。
- B-002: 形式固有のjob生成・設定・encoderはcallback/specに残す。
- B-003: PDF/SVG固有処理を無理に同じ抽象化へ入れない。
- B-004: 既存の外部挙動と形式別テストsuiteを維持する。
- B-005: 外部tool実行は配列args、signal、stderr、redacted logを小helperで統一する。

### Unresolved

- runnerの最終APIは0190開始時の重複とテスト境界を確認して決める。

### Affected boundaries

convert PNG/JPEG/WebP/AVIF/SVG/PDF command、external tool runner。

### Allowed files

- `src/commands/convert_to_*.ts`
- `src/commands/convert_png_to_pdf.ts`
- `src/commands/run_output_conversion.ts`
- `src/commands/progress_cancellation.ts`
- `src/operations/external_tool_*.ts`
- `src/operations/convert_to_*.ts`
- `src/operations/convert_png_to_pdf.ts`
- `src/operations/run_external_tool.ts`
- `test/run_external_tool.test.ts`
- `AGENTS.md`
- `test/convert_to_*_command.test.ts`
- `test/convert_to_pdf_command.test.ts`
- `docs/specs/output-format-conversion.md`
- `docs/tasks/0190-reduce-conversion-command-review-surface.md`
- `docs/tasks/0191-reduce-raster-operation-review-surface.md`
- `docs/tasks/README.md`

### Related

- [出力形式変換仕様](../specs/output-format-conversion.md)

### Evidence matrix

| Behavior | Test / verification                          | Evidence type           |
| -------- | -------------------------------------------- | ----------------------- |
| B-001    | command cancellation and notification suites | command tests           |
| B-002    | format-specific command tests                | behavior tests          |
| B-003    | PDF/SVG regression suites                    | regression test         |
| B-004    | full conversion test suite                   | integration-style tests |
| B-005    | external runner unit/error tests             | unit and log tests      |

### Dependencies

- Blocked by: 0189
- Blocks: 0191
- Can run in parallel with: 0192, 0193

### Not changing

- raster operation pipeline
- settings migration
- new dependency or command framework

## Completion criteria

- 人間レビューで形式固有差分が見える。
- 共通化が形式固有挙動を隠していない。
- テストとcheckを実測する。

## Verification results

| Command                                                                                                                                                                         | Result | Notes                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `pnpm run check:all`                                                                                                                                                            | PASS   | runtime/test/Webview typechecks, RuleSync, task preflight, NLS |
| `./node_modules/.bin/vscode-test --grep "PNGに変換コマンド\|JPEGに変換コマンド\|WebPに変換コマンド\|AVIFに変換コマンド\|SVGに変換コマンド\|PDFに変換コマンド\|外部tool runner"` | PASS   | 50 tests                                                       |
| `git diff --check`                                                                                                                                                              | PASS   | no whitespace errors                                           |

### Implementation note

最終実装では責務を小さく保つため、runnerはprogress、CancellationToken bridge、Undo登録、通知に限定した。selection、configuration読込み、形式固有job生成は各commandに残し、runnerをgeneric workflowへ拡張していない。
