# PDF configure cropの内部protocol

`cropPdf.configure`の利用者向け挙動は、[product specification](../product/crop-pdf-configure.md)を正本とする。この文書はHostとWebviewが依存する内部contractだけを記録する。

## Message contract

```ts
type CropConfigureHostToWebview =
  | {
      type: "init";
      payload: {
        pdfSrc: string;
        fileName: string;
        pageCount: number;
        initialPage: number;
        labels: CropPdfLabels;
      };
    }
  | { type: "error"; payload: { message: string } };

type CropConfigureWebviewToHost =
  | { type: "ready" }
  | {
      type: "apply";
      payload: {
        cropBox: CropBox;
        target: { type: "all" } | { type: "selected"; pages: number[] };
      };
    }
  | { type: "cancel" }
  | { type: "previewLoadFailed"; payload: { message: string } };
```

`pdfSrc`はHostが入力URIをWebview向けURIへ変換した値とし、`initialPage`とpage listは1始まりとする。`CropPdfLabels`のfieldとmessage shapeはHost/Webview共有のpure protocol moduleを正本とする。

## Boundary validation

Hostは`apply`受信時に、cropBoxの数値・MediaBox内包、target、selected page番号を検証する。Webview側の入力補助検証は許可するが、正本の検証はHost側に置く。

## Rendering lifecycle

PDF metadataと最初のpageを先に読み込み、残りはplaceholderと`IntersectionObserver`で遅延renderする。Applyは全canvasのrender完了を待たず、metadataと入力値の検証後に送信できる。panel dispose時はobserver、PDF.js render task、page/document resourceを可能な範囲でcleanupする。

## Output boundary

`apply`後の処理は既存のSafe Mode、Undo、progress、cancellation方針へ接続し、Webview表示中の状態表示と最終出力反映を混同しない。
