import { createSignal, onCleanup, onMount } from "solid-js";

import { renderPdfPages, type PdfRenderController } from "../../../shared/pdf/render_pdf_pages";
import {
  applyPreviewZoom,
  capturePreviewZoomAnchor,
  clampPreviewZoom,
  restorePreviewZoomAnchor,
} from "./preview_zoom";
import { parseCropBox, parseTarget } from "./crop_input";

import type {
  CropPdfLabels,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
} from "./messages";
import { vscode } from "./vscode";

const defaultLabels: CropPdfLabels = {
  title: "Custom Crop",
  description: "Adjust the PDF crop area.",
  pageLabel: "Page",
  pages: "pages",
  preview: "Preview",
  previewDescription: "Zoom does not change crop values in PDF points.",
  previewAriaLabel: "PDF preview",
  cropSettings: "Crop settings",
  cropBox: "Crop box",
  cropBoxDescription: "Set the area to keep in PDF points.",
  left: "Left",
  bottom: "Bottom",
  right: "Right",
  top: "Top",
  currentPageSize: "Current page size",
  targetPages: "Target pages",
  allPages: "All pages",
  selectedPages: "Selected pages",
  pagesInput: "Pages",
  pagesPlaceholder: "Example: 1, 3, 5",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  previewZoom: "Preview zoom",
  apply: "Apply",
  cancel: "Cancel",
  previewRenderError: "Could not display the PDF",
  previewApplyError: "PDF preview must render before applying.",
  cropBoxNumberError: "{0} must be a number.",
  cropBoxSizeError: "Crop box must have positive width and height.",
  pagesRequiredError: "At least one page must be selected.",
  pageWholeNumberError: "Page must be a whole number: {0}",
  pageOutOfRangeError: "Selected page is out of range: {0}",
};

export function App() {
  const [fileName, setFileName] = createSignal("");
  const [pageCount, setPageCount] = createSignal(1);
  const [pageSize, setPageSize] = createSignal({ width: 0, height: 0 });
  const [cropBox, setCropBox] = createSignal({
    left: "0",
    bottom: "0",
    right: "0",
    top: "0",
  });
  const [targetType, setTargetType] = createSignal<"all" | "selected">("all");
  const [selectedPages, setSelectedPages] = createSignal("1");
  const [previewZoom, setPreviewZoom] = createSignal(1);
  const [labels, setLabels] = createSignal(defaultLabels);
  const [renderError, setRenderError] = createSignal("");
  const [inputError, setInputError] = createSignal("");
  let pdfPages: HTMLDivElement | undefined;
  let pdfPreview: HTMLElement | undefined;
  let renderPromise: Promise<void> | undefined;
  let renderController: PdfRenderController | undefined;

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type !== "init" || !pdfPages) {
        return;
      }

      void renderController?.dispose();
      renderController = undefined;

      const initialPage = event.data.payload.initialPage ?? 1;
      const totalPages = event.data.payload.pageCount ?? 1;
      const pageWidth = event.data.payload.width ?? 0;
      const pageHeight = event.data.payload.height ?? 0;

      setFileName(event.data.payload.fileName ?? "");
      setLabels(event.data.payload.labels ?? defaultLabels);
      setPageCount(totalPages);
      setPageSize({
        width: pageWidth,
        height: pageHeight,
      });
      setCropBox({
        left: "0",
        bottom: "0",
        right: pageWidth.toString(),
        top: pageHeight.toString(),
      });
      setTargetType("all");
      setSelectedPages(initialPage.toString());
      setInputError("");
      setRenderError("");
      renderPromise = renderPdfPages(event.data.payload.pdfSrc, pdfPages, {
        ...(pdfPreview !== undefined && { root: pdfPreview }),
        ...(event.data.payload.workerSrc ? { workerSrc: event.data.payload.workerSrc } : {}),
        ...(event.data.payload.cMapUrl ? { cMapUrl: event.data.payload.cMapUrl } : {}),
        ...(event.data.payload.standardFontDataUrl
          ? { standardFontDataUrl: event.data.payload.standardFontDataUrl }
          : {}),
        ...(event.data.payload.wasmUrl ? { wasmUrl: event.data.payload.wasmUrl } : {}),
        pageLabel: labels().pageLabel,
        onRenderError: (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setRenderError(message);
          vscode.postMessage({ type: "previewLoadFailed", payload: { message } });
        },
      })
        .then((controller) => {
          renderController = controller;
          return controller.firstPageReady;
        })
        .catch((error: unknown) => {
          setRenderError(error instanceof Error ? error.message : String(error));
          throw error;
        })
        .then(() => {
          applyPreviewZoom(pdfPages, previewZoom());

          const size = getPreviewPageSize(pdfPages);

          if (
            size.width > 0 &&
            size.height > 0 &&
            pageSize().width === 0 &&
            pageSize().height === 0
          ) {
            setPageSize(size);
            const currentCropBox = cropBox();

            if (
              currentCropBox.left === "0" &&
              currentCropBox.bottom === "0" &&
              currentCropBox.right === "0" &&
              currentCropBox.top === "0"
            ) {
              setCropBox({
                left: "0",
                bottom: "0",
                right: size.width.toString(),
                top: size.height.toString(),
              });
            }
          }
        });
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });
    onCleanup(() => {
      window.removeEventListener("message", handleMessage);
      void renderController?.dispose();
    });
  });

  const applyCrop = async () => {
    if (!renderPromise) {
      setInputError(labels().previewApplyError);
      return;
    }

    try {
      await renderPromise;
    } catch {
      setInputError("PDF preview must render before applying.");
      return;
    }

    const parsedCropBox = parseCropBox(cropBox(), labels());
    const target = parseTarget(targetType(), selectedPages(), pageCount(), labels());

    if (!parsedCropBox.ok) {
      setInputError(parsedCropBox.message);
      return;
    }

    if (!target.ok) {
      setInputError(target.message);
      return;
    }

    setInputError("");

    const message: WebviewToExtensionMessage = {
      type: "apply",
      payload: {
        cropBox: parsedCropBox.value,
        target: target.value,
      },
    };

    vscode.postMessage(message);
  };

  const cancel = () => {
    const message: WebviewToExtensionMessage = {
      type: "cancel",
    };

    vscode.postMessage(message);
  };

  const updatePreviewZoom = (
    value: number,
    anchorTarget?: EventTarget | null,
    clientX?: number,
    clientY?: number,
  ) => {
    const nextZoom = clampPreviewZoom(value);

    if (nextZoom === previewZoom()) {
      return;
    }

    const anchor = capturePreviewZoomAnchor(pdfPreview, anchorTarget, clientX, clientY);

    setPreviewZoom(nextZoom);
    applyPreviewZoom(pdfPages, nextZoom);
    restorePreviewZoomAnchor(pdfPreview, anchor);
  };

  const zoomOut = () => {
    updatePreviewZoom(previewZoom() - 0.25);
  };

  const zoomIn = () => {
    updatePreviewZoom(previewZoom() + 0.25);
  };

  const zoomWithWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    updatePreviewZoom(
      previewZoom() + (event.deltaY < 0 ? 0.1 : -0.1),
      event.target,
      event.clientX,
      event.clientY,
    );
  };

  return (
    <main class="app">
      <header class="app__header">
        <div>
          <h1>{labels().title}</h1>
          <p>{labels().description}</p>
        </div>
        <p class="app__meta">
          {fileName()} · {pageCount()} {labels().pages}
        </p>
      </header>

      <div class="workspace">
        <section
          ref={(element) => (pdfPreview = element)}
          aria-label={labels().previewAriaLabel}
          class="pdf-preview"
          onWheel={zoomWithWheel}
        >
          <div class="pdf-preview__toolbar">
            <div>
              <h2>{labels().preview}</h2>
              <p>{labels().previewDescription}</p>
            </div>
            <div class="zoom" aria-label={labels().previewZoom}>
              <button class="button" type="button" aria-label={labels().zoomOut} onClick={zoomOut}>
                −
              </button>
              <span class="zoom__value">{Math.round(previewZoom() * 100)}%</span>
              <button class="button" type="button" aria-label={labels().zoomIn} onClick={zoomIn}>
                +
              </button>
            </div>
          </div>
          <div ref={(element) => (pdfPages = element)} class="pdf-preview__pages" />
          {renderError() ? (
            <p class="pdf-preview__error" role="alert">
              {labels().previewRenderError}: {renderError()}
            </p>
          ) : undefined}
        </section>

        <section aria-label={labels().cropSettings} class="panel">
          <div class="panel__group">
            <h2>{labels().cropBox}</h2>
            <p>{labels().cropBoxDescription}</p>

            <div class="crop-grid">
              <label class="field">
                <span class="field__label">{labels().left}</span>
                <input
                  class="input"
                  inputmode="decimal"
                  type="number"
                  value={cropBox().left}
                  onInput={(event) => setCropBox({ ...cropBox(), left: event.currentTarget.value })}
                />
              </label>

              <label class="field">
                <span class="field__label">{labels().bottom}</span>
                <input
                  class="input"
                  inputmode="decimal"
                  type="number"
                  value={cropBox().bottom}
                  onInput={(event) =>
                    setCropBox({ ...cropBox(), bottom: event.currentTarget.value })
                  }
                />
              </label>

              <label class="field">
                <span class="field__label">{labels().right}</span>
                <input
                  class="input"
                  inputmode="decimal"
                  type="number"
                  value={cropBox().right}
                  onInput={(event) =>
                    setCropBox({ ...cropBox(), right: event.currentTarget.value })
                  }
                />
              </label>

              <label class="field">
                <span class="field__label">{labels().top}</span>
                <input
                  class="input"
                  inputmode="decimal"
                  type="number"
                  value={cropBox().top}
                  onInput={(event) => setCropBox({ ...cropBox(), top: event.currentTarget.value })}
                />
              </label>
            </div>

            <p class="panel__hint">
              {labels().currentPageSize}: {pageSize().width} × {pageSize().height} pt
            </p>
          </div>

          <fieldset class="target">
            <legend>{labels().targetPages}</legend>

            <label class="target__option">
              <input
                checked={targetType() === "all"}
                name="target"
                type="radio"
                onChange={() => setTargetType("all")}
              />
              {labels().allPages}
            </label>

            <label class="target__option">
              <input
                checked={targetType() === "selected"}
                name="target"
                type="radio"
                onChange={() => setTargetType("selected")}
              />
              {labels().selectedPages}
            </label>

            <label class="field">
              <span class="field__label">{labels().pagesInput}</span>
              <input
                class="input"
                disabled={targetType() !== "selected"}
                placeholder={labels().pagesPlaceholder}
                type="text"
                value={selectedPages()}
                onInput={(event) => setSelectedPages(event.currentTarget.value)}
              />
            </label>
          </fieldset>

          {inputError() ? (
            <p class="panel__error" role="alert">
              {inputError()}
            </p>
          ) : undefined}

          <div class="actions">
            <button class="button button--primary" type="button" onClick={applyCrop}>
              {labels().apply}
            </button>
            <button class="button" type="button" onClick={cancel}>
              {labels().cancel}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function getPreviewPageSize(container: HTMLDivElement | undefined): {
  width: number;
  height: number;
} {
  const firstPageCanvas = container?.querySelector<HTMLCanvasElement>('canvas[data-pdf-page="1"]');

  if (!firstPageCanvas) {
    return { width: 0, height: 0 };
  }

  const width = Number(firstPageCanvas.dataset.pdfWidth);
  const height = Number(firstPageCanvas.dataset.pdfHeight);

  return {
    width: Number.isFinite(width) ? width : firstPageCanvas.width,
    height: Number.isFinite(height) ? height : firstPageCanvas.height,
  };
}
