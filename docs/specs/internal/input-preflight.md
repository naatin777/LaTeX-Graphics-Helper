# 変換入力preflightの内部契約

## 目的

変換操作を開始する前に、全入力ファイルを検査し、処理途中での失敗や不完全な出力を未然に防ぐ。検査は入力ファイルを変更しない。

## 用語

| 用語               | 意味                                                                  |
| ------------------ | --------------------------------------------------------------------- |
| 軽量検査           | ファイルheader、拡張子、file size、metadataの高速な確認。全形式で必須 |
| 詳細検査           | 実decode、render、外部CLIによる内容確認。形式とcostに応じて選択        |
| preflight batch    | 全入力を先に検査し、1件でもエラーがあれば変換を開始しない              |

## 結果の3段階

| 結果         | 意味                                       | 後続処理              |
| ------------ | ------------------------------------------ | --------------------- |
| `ok`         | 検査通過、変換可能                         | 変換を開始する        |
| `warning`    | 軽度の問題。変換できるが結果が不完全かも   | ユーザー確認後に続行  |
| `error`      | 変換不能。破損・未対応形式・resource超過   | 変換全体を停止する    |

`warning` は次の場合に使う。

- 拡張子と内容形式が異なるが、内容側で変換可能な場合
- PDFのMediaBoxが異常に大きいが処理可能な場合
- 画像のpixel数が出力上限に近い場合
- EPSのBoundingBoxが `(atend)` で事前検証できない場合
- Mermaidのsyntaxが非標準だがCLIが処理できる場合

`warning` 発生時は全件のwarningを一覧で表示し、ユーザーが確認した場合だけ変換を開始する。`warning` だけの場合は停止せず、ユーザーが続行を選択できる。

`error` 発生時は理由を明示し、変換全体を開始しない。1件のerrorが1件のwarningより優先される。

## 共通検査

すべての形式で次を確認する。これらは既存の `validateJobs` / `validateJobPaths` で実装済み。

| #  | 検査項目                         | 失敗時の結果 | 実装状態 |
| -- | -------------------------------- | ------------ | -------- |
| C1 | ファイルが存在し読み取り可能     | error        | ✅ 実装済み |
| C2 | workspace内のファイルである      | error        | ✅ 実装済み |
| C3 | 空ファイルでない                 | error        | 未実装   |
| C4 | file sizeが上限以下               | error        | 未実装   |

### 共通resource上限

| 制限          | 初期値       | 理由                                      |
| ------------- | ------------ | ----------------------------------------- |
| file size     | 500 MB       | sharpのdecode memory、Ghostscript timeout  |
| 展開後pixel数 | 100 MPixel   | sharpのmemory使用量と処理時間              |
| PDF page数    | 1,000 pages  | crop/splitの処理時間と中間file数           |
| EPS timeout   | 30 秒        | 既存の `convertEpsToPdf` で実装済み       |

上限は設定可能にするが、初期実装では固定値を使う。上限超過は `error` とし、値と上限をメッセージに含める。

上限を超えていても「ユーザーが明示的に許可した場合だけ処理する」フローは初期実装に含めない。

## 形式別検査

### PDF

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool         |
| -- | -------------------------------- | -------- | ------------ | ---------------- |
| P1 | PDFとしてparse可能               | 軽量     | error        | `pdf-lib`        |
| P2 | 1ページ以上存在する              | 軽量     | error        | `pdf-lib`        |
| P3 | 暗号化されていない               | 軽量     | error        | `pdf-lib`        |
| P4 | 各ページのMediaBoxが有限で妥当   | 軽量     | warning      | `pdf-lib`        |
| P5 | page数が上限以下                 | 軽量     | error        | `pdf-lib`        |
| P6 | qpdfで構造検査可能               | 詳細(opt)| warning      | `qpdf --check`   |

P3: passwordが必要なPDFは、password入力仕様を実装するまで `error` として停止する。理由を明示する。

P6: qpdfが利用可能な場合だけ実行する。利用不能でも他の検査が通れば変換を開始する。qpdfのwarningは `warning` として扱う。

### Raster画像（PNG、JPEG、WebP、AVIF、GIF、TIFF）

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool    |
| -- | -------------------------------- | -------- | ------------ | ----------- |
| R1 | sharpでmetadata取得可能          | 軽量     | error        | `sharp`     |
| R2 | width、heightが正の整数          | 軽量     | error        | `sharp`     |
| R3 | page数が想定範囲内               | 軽量     | warning      | `sharp`     |
| R4 | pixel数が上限以下                | 軽量     | error        | `sharp`     |
| R5 | 全pixelのdecodeが可能            | 詳細(opt)| error        | `sharp`     |

R3: GIF animation、multi-page TIFF の2page目以降は変換対象外（先頭pageのみ処理する）。2page以上の場合は `warning` とし、先頭pageだけ処理する旨を表示する。

R5: file sizeが小さい（10 MB以下）場合だけ実施する。大きい場合はskipする。

### SVG

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool          |
| -- | -------------------------------- | -------- | ------------ | ----------------- |
| S1 | XMLとしてparse可能               | 軽量     | error        | `fast-xml-parser` |
| S2 | rootが `<svg>` である            | 軽量     | warning      | `fast-xml-parser` |
| S3 | width/height/viewBoxが解釈可能   | 軽量     | warning      | `fast-xml-parser` |
| S4 | 採用rendererで描画可能           | 詳細(opt)| error        | `sharp`           |

S2: rootが `<svg>` でなくてもsharpが読める場合がある。`warning` として扱い、続行可能とする。

S3: width/heightがない場合は `warning`。viewBoxもない場合は `error`。

S4: sharpのmetadata取得で代用する。sharpが読めれば描画可能とみなす。

script要素と外部resource参照（`<use href="...">`、`<image href="...">`）は静的に検出せず、変換失敗時のerrorとして扱う。

### Mermaid

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool             |
| -- | -------------------------------- | -------- | ------------ | -------------------- |
| M1 | textとして読み取り可能           | 軽量     | error        | `fs.readFile`        |
| M2 | Mermaid CLIでsyntax検査可能      | 詳細     | error        | `@mermaid-js/mermaid-cli`（dry-run） |
| M3 | file sizeが上限以下              | 軽量     | error        | `stat`               |

M2: Mermaid CLIはsyntax errorがあるとexit code 1で失敗する。dry-run（SVG出力を `/dev/null` または一時fileへ出力してから削除）でsyntaxだけ確認する。成功したSVGは保持しない。

Mermaid CLIの起動costが高いため、M2は常に実行するのではなく、M1とM3が通った場合だけ実行する。バッチ内にMermaid入力が複数ある場合は並列でdry-runする。

### Draw.io

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool           |
| -- | -------------------------------- | -------- | ------------ | ------------------ |
| D1 | XMLとしてparse可能               | 軽量     | error        | `fast-xml-parser`  |
| D2 | mxGraphModel要素が存在する       | 軽量     | warning      | `fast-xml-parser`  |
| D3 | editable PNG/SVGにdiagram dataが埋め込まれている | 軽量 | error | `draw.io` CLI check |

D2: mxGraphModelがない場合、draw.io documentではない可能性がある。`warning` とし、Draw.io CLIが読めなければ変換時に失敗する。

D3: editable PNG/SVGはdraw.io CLIの `--check` または軽量なexport（`-x -f pdf` で空出力確認）で検証する。検証失敗は `error` とする。

### EPS

| #  | 検査項目                         | 種類     | 失敗時の結果 | 使用tool        |
| -- | -------------------------------- | -------- | ------------ | --------------- |
| E1 | PostScript headerが存在          | 軽量     | error        | `readFileSync`  |
| E2 | BoundingBoxが妥当                | 軽量     | error        | `readFileSync`  |
| E3 | BoundingBoxが `(atend)`          | 軽量     | warning      | `readFileSync`  |
| E4 | BoundingBox dimensionsが上限以下 | 軽量     | error        | `readFileSync`  |
| E5 | GhostscriptでPDF生成可能         | 詳細(opt)| error        | `gs` dry-run    |

E1-E4は既存の `validateEpsInput` で実装済み。

E5: 実際の変換は行わず、`-dNODISPLAY` でinterpretだけ確認する方法を検討する。変換と同じcostがかかるため、初期実装ではE1-E4に留め、E5はskipする。

## Batch preflight flow

```
command実行
  │
  ├─ 共通検査（全入力）
  │   ├─ 1件でもerror → 停止、理由を表示
  │   └─ 全件ok/warning → 続行
  │
  ├─ 形式別検査（入力ごとに）
  │   ├─ 1件でもerror → 停止、全errorを表示
  │   ├─ warningのみ → 全warningを一覧表示、ユーザー確認
  │   │   ├─ 続行 → 変換開始
  │   │   └─ 取消 → 停止（AbortError）
  │   └─ 全件ok → 変換開始
  │
  └─ 変換処理（既存フロー）
```

preflight完了後に変換を開始する。preflight通過後にファイルが変更された場合の競合は検出しない（既存のcommit時検証でカバーする）。

## 詳細検査のトリガー条件

詳細検査（マーク `詳細(opt)`）は常に実行しない。次の条件でトリガーする。

- `R5`（全pixel decode）: file size ≤ 10 MB の場合のみ
- `P6`（qpdf check）: qpdfが利用可能な場合のみ
- `E5`（Ghostscript dry-run）: 初期実装ではskip
- `M2`（Mermaid干-run）: Mermaid CLIが利用可能な場合のみ
- `D3`（Draw.io check）: Draw.io CLIが利用可能な場合のみ

外部CLIが利用不能でも、軽量検査が通れば変換を開始する。外部CLIの不在を理由に変換を拒否しない。

## ProgressとCancellation

preflightは進捗表示の対象にする。

```
[preflight] 5件中3件を検査中...
```

cancel時はpreflightを中断し、変換全体を開始しない。AbortErrorとしてcommand層へ伝播する。

## Output channel

preflight結果はOutput channelへ記録する。ユーザー通知は簡潔に、Output channelは詳細に。

```text
[preflight] file: <workspace path>
[preflight]   format: pdf, size: 1.2 MB, pages: 3
[preflight]   result: ok
[preflight] file: <workspace path>
[preflight]   format: png, size: 45.0 MB, 12000x8000, 96 MPixel
[preflight]   result: warning (pixel count 96M exceeds recommended 50M)
[preflight] file: <workspace path>
[preflight]   format: pdf, size: 0 B
[preflight]   result: error (empty file)
```

## 実装方針

### Phase 1: 軽量検査（全形式）

既存の `validateJobs`/`validateJobPaths` に統合する。すべての変換操作の開始時に自動実行される。

新規実装:

- `validatePreflightInputs()`: 全入力の共通検査 + 形式別軽量検査
- 形式別validator: `validatePdfInput()`, `validateRasterInput()`, `validateSvgInput()`, `validateMermaidInput()`, `validateDrawioInput()`, `validateEpsInput()`（既存）

各validatorは同期関数とし、同期的に取得できる情報（header、metadata）だけを検査する。

### Phase 2: 詳細検査（opt-in）

- `qpdf --check` によるPDF構造確認
- Mermaid CLI dry-run
- 全pixel decode（file size条件付き）

詳細検査は非同期関数とし、軽量検査の後、変換開始前に実行する。

### Phase 3: warning UX

- `warning` 発生時のユーザー確認dialog
- 全warningの一覧表示
- 「続行」/「取消」の選択

## 既存実装との関係

既存の `validateJobs` / `validateJobPaths` は共通検査 C1-C2 をカバーしている。preflight仕様ではこれらを置き換えず、追加の検査として実装する。

preflightの結果型:

```typescript
type PreflightResult = 'ok' | 'warning' | 'error';

interface PreflightReport {
  sourcePath: string;
  format: SourceFormat;
  result: PreflightResult;
  reason?: string;
  details?: Record<string, unknown>;
}

interface BatchPreflightResult {
  reports: PreflightReport[];
  errors: PreflightReport[];
  warnings: PreflightReport[];
  canProceed: boolean;
}
```

## 対象外

- 入力ファイルの自動修復
- password入力UI
- 拡張子の自動修正
- preflight結果に基づく出力pathの自動調整
- 形式変換（壊れたPNGをJPEGとして処理するなど）

## テスト計画

### 形式別fixture

| 形式    | ok fixture           | warning fixture             | error fixture          |
| ------- | -------------------- | --------------------------- | ---------------------- |
| PDF     | 1 page PDF           | 1000 page PDF               | 破損PDF、空PDF         |
| PNG     | 100x100 PNG          | 10000x10000 PNG (100 MPixel)| 破損PNG、0 byte        |
| JPEG    | 標準JPEG             | 超巨大JPEG                  | 破損JPEG               |
| SVG     | 標準SVG              | rootが非svg、width/viewBox無し| XMLでない、空SVG      |
| Mermaid | 有効な.mmd           | —                           | syntax error、空file   |
| Draw.io | 有効な.drawio        | mxGraphModel無し            | XMLでない              |
| EPS     | 最小EPS              | BoundingBox (atend)         | header無し、bbox不正   |

テストでは実際の `validate*Input` 関数を呼び出し、結果型が期待と一致することを確認する。

## 関連

- [出力形式基準の変換仕様](output-format-conversion.md)
- [ファイル操作security仕様](file-operation-security.md)
- [EPS変換の内部契約](eps-conversion.md)
- [変換入力preflightタスク](../../tasks/0128-design-input-preflight-validation.md)
- [sharpとGhostscriptの追加形式予備調査](../../research/2026-07-10-sharp-ghostscript-additional-formats.md)
