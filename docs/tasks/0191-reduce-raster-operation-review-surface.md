# raster operationの共通pipelineを整理する

## Status

In Progress

## Change Contract

### Problem

PNG/JPEG/WebP/AVIF operationにstaging、source dispatch、concurrency、cancel、commit、cleanupが重複している。

### Allowed behaviors

- B-001: raster共通pipelineがjob validation、staging、dispatch、cancel、commit、cleanupを担う。
- B-002: encoder、拡張子、quality、same-format拒否は形式別specに残す。
- B-003: PDF/SVGをraster abstractionへ押し込まない。
- B-004: 形式別テストsuiteと実変換結果検証を維持する。
- B-005: source format判定、logical source path、supported extensionsを小pure moduleへ一元化する。

### Unresolved

- editable Draw.ioの形式判定名と既存config移行は、実コード照合後に決める。

### Affected boundaries

raster operations、source format、output path、Sharp encoder、Draw.io/Mermaid dispatch。

### Allowed files

- `src/operations/convert_to_png.ts`
- `src/operations/convert_to_jpeg.ts`
- `src/operations/convert_to_webp.ts`
- `src/operations/convert_to_avif.ts`
- `src/application/source_format.ts`
- `src/config/resolve_output_path.ts`
- `test/convert_to_*_operation.test.ts`
- `test/resolve_output_path.test.ts`
- `docs/specs/output-format-conversion.md`
- `docs/tasks/0191-reduce-raster-operation-review-surface.md`
- `docs/tasks/README.md`

### Related

- [出力形式変換仕様](../specs/output-format-conversion.md)

### Evidence matrix

| Behavior | Test / verification             | Evidence type           |
| -------- | ------------------------------- | ----------------------- |
| B-001    | raster operation suite          | integration-style tests |
| B-002    | per-format encoder tests        | behavior tests          |
| B-003    | PDF/SVG regression suite        | regression test         |
| B-004    | fixed fixture output assertions | conversion tests        |
| B-005    | pure source format tests        | unit test               |

### Dependencies

- Blocked by: 0189, 0190
- Blocks: 0194
- Can run in parallel with: 0192, 0193

### Not changing

- external dependency versions
- PDF/SVG pipeline
- generic conversion engine or plugin graph

## Completion criteria

- raster固有差分を短くレビューできる。
- 既存の安全境界と実ファイル検証を維持する。
- taskのVerification resultsを実測する。

## Verification results

| Command | Result | Notes |
| ------- | ------ | ----- |
