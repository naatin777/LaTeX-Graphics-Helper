export interface CropBox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export type CropTarget = { type: "all" } | { type: "selected"; pages: number[] };

export interface CropPdfLabels {
  title: string;
  description: string;
  pageLabel: string;
  pages: string;
  preview: string;
  previewDescription: string;
  previewAriaLabel: string;
  cropSettings: string;
  cropBox: string;
  cropBoxDescription: string;
  left: string;
  bottom: string;
  right: string;
  top: string;
  currentPageSize: string;
  targetPages: string;
  allPages: string;
  selectedPages: string;
  pagesInput: string;
  pagesPlaceholder: string;
  zoomOut: string;
  zoomIn: string;
  previewZoom: string;
  apply: string;
  cancel: string;
  previewRenderError: string;
  previewApplyError: string;
  cropBoxNumberError: string;
  cropBoxSizeError: string;
  pagesRequiredError: string;
  pageWholeNumberError: string;
  pageOutOfRangeError: string;
}

export type CropConfigureHostToWebview =
  | {
      type: "init";
      payload: {
        pdfSrc: string;
        workerSrc?: string;
        cMapUrl?: string;
        standardFontDataUrl?: string;
        wasmUrl?: string;
        fileName: string;
        pageCount: number;
        initialPage: number;
        width?: number;
        height?: number;
        labels: CropPdfLabels;
      };
    }
  | {
      type: "error";
      payload: { message: string };
    };

export type CropConfigureWebviewToHost =
  | { type: "ready" }
  | {
      type: "apply";
      payload: { cropBox: CropBox; target: CropTarget };
    }
  | { type: "cancel" }
  | {
      type: "previewLoadFailed";
      payload: { message: string };
    };

export function isCropConfigureMessage(value: unknown): value is CropConfigureWebviewToHost {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type === "ready" || value.type === "cancel") {
    return true;
  }

  if (value.type === "previewLoadFailed") {
    return (
      "payload" in value &&
      typeof value.payload === "object" &&
      value.payload !== null &&
      "message" in value.payload &&
      typeof value.payload.message === "string"
    );
  }

  if (value.type !== "apply" || !("payload" in value)) {
    return false;
  }

  if (typeof value.payload !== "object" || value.payload === null) {
    return false;
  }

  return (
    "cropBox" in value.payload &&
    isCropBox(value.payload.cropBox) &&
    "target" in value.payload &&
    isCropTarget(value.payload.target)
  );
}

function isCropBox(value: unknown): value is CropBox {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return ["left", "bottom", "right", "top"].every(
    (key) => typeof record[key] === "number" && Number.isFinite(record[key]),
  );
}

function isCropTarget(value: unknown): value is CropTarget {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  if (value.type === "all") {
    return true;
  }

  return (
    value.type === "selected" &&
    "pages" in value &&
    Array.isArray(value.pages) &&
    value.pages.every((page) => Number.isInteger(page) && page > 0)
  );
}
