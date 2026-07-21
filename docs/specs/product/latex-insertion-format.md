# LaTeX挿入フォーマットの仕様

## 目的

PDF／画像ファイルの drag & drop、clipboard 画像 paste 時に挿入する LaTeX コードの形式を、テンプレート文字列でカスタマイズ可能にする。

## 設定

| 設定キー | 型 | 既定値 |
|---------|-----|--------|
| `latex-graphics-helper.insertLatex.pdfTemplate` | `string` | `\begin{figure}[H]\centering\includegraphics[width=\linewidth]{${path}}\caption{${name}}\label{fig:${name}}\end{figure}` |
| `latex-graphics-helper.insertLatex.imageTemplate` | `string` | `\begin{figure}[H]\centering\resizebox{\linewidth}{!}{\includegraphics{${path}}}\caption{${name}}\label{fig:${name}}\end{figure}` |

## テンプレート変数

| 変数 | 展開内容 | 例 |
|------|---------|-----|
| `${path}` | ドキュメントからの相対パス | `figures/graph.pdf` |
| `${name}` | 拡張子を除いたファイル名 | `graph` |
| `${ext}` | 拡張子（ドットなし） | `pdf` |
| `${page}` | PDFのページ番号（drag & dropでページ選択時） | `1` |
| `${dir}` | ファイルのあるディレクトリ（相対） | `figures` |

## 動作

### drag & drop（PDF）

- PDF → `pdfTemplate` を使用
- ページ選択時は `${page}` にページ番号が入る
- 複数ファイル同時 drop 時は `subfigure` 環境でラップする（既存動作を維持）

### drag & drop（画像）

- PNG/JPEG/WebP/AVIF/GIF/TIFF/SVG/EPS → `imageTemplate` を使用
- 複数ファイル同時 drop 時は `subfigure` 環境でラップする（既存動作を維持）

### clipboard paste（画像）

- 保存された画像ファイル → `imageTemplate` を使用
- 保存先パスは既存の `outputPath.clipboardImage` 設定に従う

## 既存の詳細設定との関係

既存の `figure.placementOptions`、`figure.alignmentOptions`、`figure.graphicsOptions`、`subfigure.*` 設定は、テンプレート方式に移行した後も互換のために残す。

テンプレートがデフォルト値のままの場合、既存の個別設定が反映される（後方互換）。

テンプレートがカスタマイズされた場合は、テンプレートの内容が優先され、個別設定は無視される。

## テンプレートのバリデーション

- `${path}` が含まれていない場合は警告（必須変数）
- 未知の変数（`${xxx}`）はそのまま文字列として残す（エラーにはしない）

バリデーションは拡張機能起動時または設定変更時に行い、Output channel に警告を記録する。

## パッケージマニフェスト

```json
{
  "latex-graphics-helper.insertLatex.pdfTemplate": {
    "type": "string",
    "default": "\\begin{figure}[H]\n  \\centering\n  \\includegraphics[width=\\linewidth]{${path}}\n  \\caption{${name}}\n  \\label{fig:${name}}\n\\end{figure}",
    "description": "%config.insertLatex.pdfTemplate%"
  },
  "latex-graphics-helper.insertLatex.imageTemplate": {
    "type": "string",
    "default": "\\begin{figure}[H]\n  \\centering\n  \\resizebox{\\linewidth}{!}{\\includegraphics{${path}}}\n  \\caption{${name}}\n  \\label{fig:${name}}\n\\end{figure}",
    "description": "%config.insertLatex.imageTemplate%"
  }
}
```

## テスト計画

- デフォルトテンプレートで PDF drop → 期待される LaTeX コードが生成される
- デフォルトテンプレートで画像 drop → `resizebox` が含まれる
- カスタムテンプレート（`\includegraphics{${path}}` のみ）→ `figure` 環境なしで生成される
- `${name}`、`${ext}`、`${dir}` 変数が正しく展開される
- 複数ファイル drop → `subfigure` 環境が正しく生成される
- clipboard paste → 保存先パスが `${path}` に展開される
- テンプレート空文字 → エラーまたはデフォルトフォールバック
- 後方互換：テンプレート未設定時は既存の個別設定が使われる

## 対象外

- `subfigure` テンプレートの個別設定
- `caption` / `label` の有無の切り替え（テンプレート変数で対応）
- テンプレートのリアルタイムプレビュー

## 関連

- [出力形式基準の変換仕様](output-format-conversion.md)
- [0119: LaTeX挿入フォーマットの仕様を決める](../../tasks/0119-design-latex-insertion-format.md)
