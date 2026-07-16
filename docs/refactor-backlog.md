# Refactor Backlog

気になる実装は、すぐ直さずここに記録する。

リファクタリングは、気持ち悪さを消すためではなく、具体的な変更コスト・バグリスク・テスト困難を減らすために行う。

## Rule

リファクタしてよい条件。

- バグリスクがある
- 次の機能追加を妨げている
- テストしづらい
- 同じ問題が3回出た
- ファイルや責務が大きくなり、理解が難しくなっている

リファクタしない条件。

- なんとなく綺麗にしたい
- 命名が気になるだけ
- 軽微な重複
- MVP前の構成整理
- 機能追加のついで

## Template

### タイトル

- Area:
- Type:
  - Duplication
  - Naming
  - Architecture
  - Testability
  - Bug risk
  - Readability
  - Preference

- Why it bothers me:
- Concrete problem:
- Do now?
  - Yes / No

- Condition to do:
- Related files:

---

## Items

### RuleSyncの履歴ファイルを整理する

- Area: AI harness
- Type: Readability
- Concrete problem: `.rulesync/`と過去taskには、現在は必須でない生成・Stop hook運用の記述が残っている。
- Evidence: ADR-0016で`AGENTS.md`をv1の正本に変更し、package/CIからRuleSync必須checkを外した。
- Trigger: 次majorでRuleSyncを再導入するか、履歴ファイルを削除・archiveする判断をするとき。
- Why not now: 現在削除すると過去taskとADRの参照履歴を大きく変更し、v1の構造整理と混ざる。
- Related files: `.rulesync/**`, `rulesync.jsonc`, `docs/adr/0001-use-agents-md-for-codex-rules.md`, `docs/adr/0016-use-handwritten-agents-for-v1.md`
- Expected test impact: RuleSyncを再導入する場合は生成物とCI導線の確認が必要。
- Reversibility: `AGENTS.md`を正本として維持したまま履歴ファイルを段階的にarchiveできる。

### 形式別operationの残る引数列

- Area: conversion operations
- Type: Readability
- Concrete problem: raster operationの公開optionsには、legacy test injectionとruntime値（signal、conflict resolver、Output Channel）がまだ混在している。
- Evidence: `src/operations/convert_to_png.ts`、`convert_to_jpeg.ts`、`convert_to_webp.ts`、`convert_to_avif.ts`の`ConvertTo*FilesOptions`。
- Trigger: 次に形式別operationの依存を変更するとき、または同じruntime値を追加するとき。
- Why not now: 今回はstaged batchとcommand runnerの共有境界を先に固定し、既存の安全性テストと直接operation callerを無用に書き換えない。
- Related files: `src/operations/conversion_runtime.ts`, `src/operations/run_staged_conversion_batch.ts`, `src/operations/convert_to_*.ts`, `test/convert_to_*_operation.test.ts`
- Expected test impact: operation APIの回帰、Safe Mode、cancellation、tool injectionの再確認が必要。
- Reversibility: runtimeをoptionsへ導入する変更は、形式別に戻せる。

### PDF/SVGのstaging batch重複

- Area: conversion operations
- Type: Duplication
- Concrete problem: PDF/SVG operationにもstaging・concurrency・commit・cleanupの似た処理が残っている。
- Evidence: `src/operations/convert_png_to_pdf.ts`と`src/operations/convert_to_svg.ts`はraster batchとは別の形式固有pipelineを持つ。
- Trigger: PDF/SVGの安全性変更が同じ境界で3回以上必要になったとき。
- Why not now: PDF/SVGはrasterと異なるtool/encoder差分があり、今回の共通化でgeneric conversion engineへ近づけない。
- Related files: `src/operations/convert_png_to_pdf.ts`, `src/operations/convert_to_svg.ts`, `src/operations/run_staged_conversion_batch.ts`
- Expected test impact: PDF/SVGの実変換、external tool failure、cleanup、Safe Modeの全suite。
- Reversibility: 形式固有のまま小さいhelperを導入できる。

---
