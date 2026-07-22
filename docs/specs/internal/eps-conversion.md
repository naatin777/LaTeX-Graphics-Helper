# EPS変換の内部契約

## 目的

EPS（Encapsulated PostScript）を既存の出力形式基準commandの入力として安全に扱うための変換経路、security境界、preflight条件を定義する。

EPSはPostScript programであり、通常の画像形式とは異なり任意のPostScript codeを実行できる。そのため、Ghostscriptのsafe mode、resource制限、生成PDFの検証を必須とする。

本仕様の実装は別PRで行う。この文書は実装前の設計合意を記録する。

## Pipeline

```text
EPS (.eps)
 └─ Ghostscript pdfwrite + -dEPSCrop
     └─ PDF (1 page, MediaBox = BoundingBox)
         ├─ 既存のPDF変換経路でPDFとして出力
         ├─ pdftocairo で PNG / JPEG / SVG へ変換
         └─ sharp を使う既存経路で WebP / AVIF へ変換
```

### 変換手順

1. EPS入力のpreflight（BoundingBox、PostScript parse、resource上限）を実施する
2. Ghostscript `-dSAFER -dNOPAUSE -dBATCH -dEPSCrop -sDEVICE=pdfwrite` でEPSをPDFへ変換する
3. 生成PDFのpreflight（1 page、MediaBox有限、破損なし）を確認する
4. 生成PDFを既存の変換経路へ渡す

Ghostscriptが生成したPDFは、既存のPDF-to-anything変換経路へそのまま渡すことができる。EPSから直接pdftocairoへ渡さず、必ずPDF中間artifactを経由する。

### Ghostscript arguments

| Argument            | 目的                                         |
| ------------------- | -------------------------------------------- |
| `-dSAFER`           | PostScript安全実行mode                       |
| `-dNOPAUSE`         | page区切りのpauseを抑制                      |
| `-dBATCH`           | 終了時にinterpreterを終了                    |
| `-dEPSCrop`         | BoundingBoxへcrop                            |
| `-sDEVICE=pdfwrite` | PDF出力device                                |
| `-dNOGC`            | 不使用。memory制限を迂回する可能性があるため |

出力PDFのpage sizeはEPSのBoundingBoxに依存する。`-dEPSCrop` を指定しない場合、defaultのMediaBox（通常A4 / Letter）が使われ、BoundingBox領域との位置関係が変わる可能性があるため必須とする。

## 入力形式の判定

`sourceFormatForPath` は `.eps` を `SourceFormat` へ追加する。

```typescript
case '.eps':
  return 'eps';
```

`isSupportedImageInputPath` は `format === 'eps'` を含めない。EPSは既存の画像入力と同じUIで扱うが、preflightとresource制限を通過したものだけを変換する。

EPS入力は次の経路で有効にする。

- `convertToPdf`（PDFとして出力）
- `convertToPng`（pdftocairo経由）
- `convertToJpeg`（pdftocairo経由）
- `convertToWebp`（sharp経由、中間PDFから）
- `convertToAvif`（sharp経由、中間PDFから）
- `convertToSvg`（pdftocairo経由）

## Preflight条件

### BoundingBox

EPS headerの `%%BoundingBox` を確認する。

| 状態      | 扱い                                        |
| --------- | ------------------------------------------- |
| 正常      | 4つの整数値。llx < urx、lly < uryを確認する |
| 欠落      | 変換しない。エラーとして通知する            |
| 不正な値  | 非整数、NaN → 変換しない                    |
| `(atend)` | Ghostscript依存。事前parseで検出しwarning   |

BoundingBoxが `%%BoundingBox: (atend)` の場合は、一度Ghostscriptで処理してから生成PDFのMediaBoxを確認する。この場合は事前rejectせず、変換後に検証する。

### PostScript構造

Preflightでは次の確認を行う。

1. ファイルの先頭が `%!PS-Adobe-` または `%!PS` で始まることを確認する
2. 埋め込みfile操作（`file`、`renamefile`、`deletefile`）をPostScript codeから静的に検出しない。`-dSAFER` への信頼により対応する

完全なPostScript parseは行わない。構造確認はheader文字列確認に留める。

### 生成PDFの検証

Ghostscript変換後に次の確認を行う。

1. PDFとしてparse可能であること
2. 1 pageのみ含まれること
3. MediaBox（およびCropBox、指定時はTrimBox）の値が有限で妥当であること
4. 空pageでないこと（1つ以上の描画commandがあること）

複数pageのPDFが生成された場合は、1 page目だけを採用するか全体をrejectする。 Ghostscriptが予期しない出力（複数page、空PDF）を生成した場合は変換を停止する。

## Security境界

### Ghostscript SAFER mode

`-dSAFER` は必須とする。これにより次のPostScript操作が制限される。

- file出力先の制限
- OS command実行の禁止
- 環境変数へのアクセス制限

GhostscriptのSAFER modeが将来のversionで変更された場合、対応するversionで `-dSAFER` の有効性を再確認する。

### execPath

Ghostscriptの実行file pathは既存の `latex-graphics-helper.execPath.ghostscript` 設定から読み取る。既存の `readGhostscriptExecutablePath` を再利用する。

Workspace境界の `execPath` 例外（`docs/specs/internal/file-operation-security.md` 参照）をEPS変換でも適用する。

### ASCII scratch

Ghostscriptは既にASCII scratchの対象toolである（`docs/specs/internal/external-tool-ascii-scratch.md` 参照）。EPS変換時のGhostscript実行でも、Windowsでは既存のASCII scratch経路を使用する。

EPS入力ファイルは論理入力からASCII scratchへcopyし、Ghostscriptへはscratch内のASCII名のみを渡す。

### 生成PDFの扱い

Ghostscriptが生成したPDF中間artifactは、ASCII scratch内で管理する。workspace内transaction stagingへのcopyは、生成PDFのpreflight通過後に行う。

## Resource制限

### Timeout

Ghostscriptの1実行あたりのtimeoutを設定可能にする。初期値は30秒とする。

変換入力の複雑さ（大量のvector data、培嚴font、複雑なtransparency）によっては、予測できない処理時間になる可能性があるため、timeoutは必須とする。

Timeout時は `AbortSignal` でGhostscript processを終了し、scratchを診断用に残す。

MemoryとDiskの固定上限は、実際のGhostscript実行結果（exit code、生成PDFのparse失敗）として扱う。Evidenceなしの固定resource上限を追加しない。

## Error分類

| 状態                  | ユーザー通知   | Output channel          |
| --------------------- | -------------- | ----------------------- |
| EPS headerなし        | 未対応の形式   | 先頭数byteを記録        |
| BoundingBox欠落・不正 | 変換不可       | 検出結果を記録          |
| Ghostscript変換失敗   | 変換不可       | exit code、stderrを記録 |
| 生成PDFが1 pageでない | 変換不可       | page数を記録            |
| 生成PDFのparse失敗    | 変換不可       | error詳細を記録         |
| Timeout               | 処理時間超過   | 実行commandを記録       |
| Ghostscript未設定     | 外部tool未設定 | 確認方法を記録          |

ユーザー通知では論理入力pathを使い、scratch pathや中間artifact名を表示しない。

## 既存機能との統合

### Safe Mode、Undo、Progress、Cancellation

EPSからの変換は既存の出力形式基準commandの一部として実行する。次の既存機能をそのまま使用する。

- Safe Modeの競合判断（論理出力に対して）
- Undo記録（論理出力とworkspace内backupのみ）
- Progress表示（`vscode.window.withProgress`）
- Cancellation（`AbortSignal`経由、Ghostscript processへ伝播）

GhostscriptのASCII scratchと生成PDF中間artifactはUndo対象にしない。これらは既存のscratch管理方針に従う。

### Batch処理

EPSファイルが他の形式と混在して選択された場合、batch全体の変換が成功するまで論理出力へ反映しない。

## テスト計画

### Unit test（設計段階）

- EPS header parse（正常・欠落・不正・atend）
- BoundingBox値の検証
- 生成PDFのpage数確認
- 既存commandへのeps入力追加

### Integration test

- 最小EPS（`%!PS-Adobe-3.0 EPSF-3.0` + BoundingBox + 単純描画）の全5出力経路変換
- BoundingBox欠落EPSのreject
- BoundingBox不正EPSのreject
- Ghostscript timeout
- 生成PDF size超過
- Ghostscript未設定時のエラー
- 複数形式混在選択にEPSを含めた場合のbatch動作

### Fixture

最小EPS fixtureを用意する。

```postscript
%!PS-Adobe-3.0 EPSF-3.0
%%BoundingBox: 0 0 100 100
%%Pages: 0
%%EndComments
newpath
0 0 moveto
100 0 lineto
100 100 lineto
0 100 lineto
closepath
stroke
```

BoundingBox欠落・不正のfixtureも別途用意する。

## 対象外（本仕様の範囲外）

- PostScript（`.ps`）形式の対応。EPSと同時に対応する価値はあるが、本仕様ではEPSのみを対象とする
- EPS出力command（出力形式としてのEPS）
- Ghostscript binaryの同梱
- EPSの埋め込みfont抽出とsubset
- EPSのpreview bitmap（DOS EPS header）の読み取り

## 関連

- [出力形式基準の変換仕様](output-format-conversion.md)
- [ファイル操作security仕様](file-operation-security.md)
- [外部コマンド用ASCII scratch仕様](external-tool-ascii-scratch.md)
- [変換処理の進捗表示とキャンセルの内部契約](conversion-progress-and-cancellation.md)
- [sharpとGhostscriptの追加形式予備調査](../../research/2026-07-10-sharp-ghostscript-additional-formats.md)
- [変換入力preflightタスク](../../tasks/0128-design-input-preflight-validation.md)
- [ADR-0010: CIの外部ツール検証はVS Code設定経由で行う](../../adr/0010-verify-external-tools-through-vscode-settings.md)
- [ADR-0012: Unicode非互換のWindows外部コマンドにはOS一時scratchを使う](../../adr/0012-use-os-temp-for-incompatible-windows-tools.md)
