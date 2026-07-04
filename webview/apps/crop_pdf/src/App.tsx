import { createSignal, onCleanup, onMount } from "solid-js";

import { renderPdfPages } from "../../../shared/pdf/render_first_page";

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { vscode } from "./vscode";

export function App() {
  const [fileName, setFileName] = createSignal("");
  const [pageCount, setPageCount] = createSignal(1);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal({ width: 0, height: 0 });
  const [cropBox, setCropBox] = createSignal({
    left: "0",
    bottom: "0",
    right: "0",
    top: "0",
  });
  const [targetType, setTargetType] = createSignal<"all" | "selected">("all");
  const [selectedPages, setSelectedPages] = createSignal("1");
  const [renderError, setRenderError] = createSignal("");
  const [inputError, setInputError] = createSignal("");
  let pdfPages: HTMLDivElement | undefined;
  let renderPromise: Promise<void> | undefined;

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type !== "init" || !pdfPages) {
        return;
      }

      const initialPage = event.data.payload.initialPage ?? 1;
      const totalPages = event.data.payload.pageCount ?? 1;
      const pageWidth = event.data.payload.width ?? 0;
      const pageHeight = event.data.payload.height ?? 0;

      setFileName(event.data.payload.fileName ?? "");
      setPageCount(totalPages);
      setCurrentPage(initialPage);
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
        ...(event.data.payload.workerSrc ? { workerSrc: event.data.payload.workerSrc } : {}),
        ...(event.data.payload.cMapUrl ? { cMapUrl: event.data.payload.cMapUrl } : {}),
        ...(event.data.payload.standardFontDataUrl
          ? { standardFontDataUrl: event.data.payload.standardFontDataUrl }
          : {}),
        ...(event.data.payload.wasmUrl ? { wasmUrl: event.data.payload.wasmUrl } : {}),
      })
        .catch((error: unknown) => {
          setRenderError(error instanceof Error ? error.message : String(error));
          throw error;
        })
        .then(() => {
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
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  const applyCrop = async () => {
    try {
      await renderPromise;
    } catch {
      setInputError("PDF preview must render before applying.");
      return;
    }

    const parsedCropBox = parseCropBox(cropBox());
    const target = parseTarget(targetType(), selectedPages(), pageCount());

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

  return (
    <main class="app">
      <header class="app__header">
        <h1>Custom Crop</h1>
        <p>PDF のトリミング範囲を調整します。</p>
        <p>
          {fileName()} {currentPage()} / {pageCount()} pages
        </p>
      </header>

      <section class="pdf-preview">
        <div ref={(element) => (pdfPages = element)} class="pdf-preview__pages" />
        {renderError() ? (
          <p class="pdf-preview__error" role="alert">
            PDFを表示できませんでした: {renderError()}
          </p>
        ) : undefined}
      </section>

      <section class="panel">
        <div class="panel__group">
          <h2>Crop box</h2>
          <p>PDFポイント単位で残す範囲を指定します。</p>

          <div class="crop-grid">
            <label class="field">
              <span class="field__label">Left</span>
              <input
                class="input"
                inputmode="decimal"
                type="number"
                value={cropBox().left}
                onInput={(event) => setCropBox({ ...cropBox(), left: event.currentTarget.value })}
              />
            </label>

            <label class="field">
              <span class="field__label">Bottom</span>
              <input
                class="input"
                inputmode="decimal"
                type="number"
                value={cropBox().bottom}
                onInput={(event) => setCropBox({ ...cropBox(), bottom: event.currentTarget.value })}
              />
            </label>

            <label class="field">
              <span class="field__label">Right</span>
              <input
                class="input"
                inputmode="decimal"
                type="number"
                value={cropBox().right}
                onInput={(event) => setCropBox({ ...cropBox(), right: event.currentTarget.value })}
              />
            </label>

            <label class="field">
              <span class="field__label">Top</span>
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
            Current page size: {pageSize().width} × {pageSize().height} pt
          </p>
        </div>

        <fieldset class="target">
          <legend>Target pages</legend>

          <label class="target__option">
            <input
              checked={targetType() === "all"}
              name="target"
              type="radio"
              onChange={() => setTargetType("all")}
            />
            All pages
          </label>

          <label class="target__option">
            <input
              checked={targetType() === "selected"}
              name="target"
              type="radio"
              onChange={() => setTargetType("selected")}
            />
            Selected pages
          </label>

          <label class="field">
            <span class="field__label">Pages</span>
            <input
              class="input"
              disabled={targetType() !== "selected"}
              placeholder="例: 1, 3, 5"
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
            Apply
          </button>
          <button class="button" type="button" onClick={cancel}>
            Cancel
          </button>
        </div>
      </section>
    </main>
  );
}

type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

function parseCropBox(value: { left: string; bottom: string; right: string; top: string }): Parsed<{
  left: number;
  bottom: number;
  right: number;
  top: number;
}> {
  for (const [key, stringValue] of Object.entries(value)) {
    if (stringValue.trim().length === 0) {
      return { ok: false, message: `${key} must be a number.` };
    }
  }

  const cropBox = {
    left: Number(value.left),
    bottom: Number(value.bottom),
    right: Number(value.right),
    top: Number(value.top),
  };

  for (const [key, numberValue] of Object.entries(cropBox)) {
    if (!Number.isFinite(numberValue)) {
      return { ok: false, message: `${key} must be a number.` };
    }
  }

  if (cropBox.left >= cropBox.right || cropBox.bottom >= cropBox.top) {
    return { ok: false, message: "Crop box must have positive width and height." };
  }

  return { ok: true, value: cropBox };
}

function parseTarget(
  targetType: "all" | "selected",
  selectedPages: string,
  pageCount: number,
): Parsed<{ type: "all" } | { type: "selected"; pages: number[] }> {
  if (targetType === "all") {
    return { ok: true, value: { type: "all" } };
  }

  const pageValues = selectedPages
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (pageValues.length === 0) {
    return { ok: false, message: "At least one page must be selected." };
  }

  const pages = pageValues.map(Number);

  for (let index = 0; index < pages.length; index += 1) {
    if (!Number.isInteger(pages[index])) {
      return { ok: false, message: `Page must be a whole number: ${pageValues[index]}` };
    }
  }

  for (const page of pages) {
    if (page < 1 || page > pageCount) {
      return { ok: false, message: `Selected page is out of range: ${page}` };
    }
  }

  return { ok: true, value: { type: "selected", pages: [...new Set(pages)] } };
}

function getPreviewPageSize(container: HTMLDivElement | undefined): {
  width: number;
  height: number;
} {
  const firstPageCanvas = container?.querySelector<HTMLCanvasElement>('canvas[data-pdf-page="1"]');

  if (!firstPageCanvas) {
    return { width: 0, height: 0 };
  }

  const width = Number.parseFloat(firstPageCanvas.style.width);
  const height = Number.parseFloat(firstPageCanvas.style.height);

  return {
    width: Number.isFinite(width) ? width : firstPageCanvas.width,
    height: Number.isFinite(height) ? height : firstPageCanvas.height,
  };
}
