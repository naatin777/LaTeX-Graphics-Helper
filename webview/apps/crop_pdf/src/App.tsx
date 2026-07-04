import { createSignal, onCleanup, onMount } from "solid-js";

import { renderPdfPages } from "../../../shared/pdf/render_first_page";

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { vscode } from "./vscode";

export function App() {
  const [fileName, setFileName] = createSignal("");
  const [pageCount, setPageCount] = createSignal(1);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal({ width: 0, height: 0 });
  const [renderError, setRenderError] = createSignal("");
  let pdfPages: HTMLDivElement | undefined;
  let renderPromise: Promise<void> | undefined;

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type !== "init" || !pdfPages) {
        return;
      }

      setFileName(event.data.payload.fileName);
      setPageCount(event.data.payload.pageCount);
      setCurrentPage(event.data.payload.initialPage);
      setPageSize({
        width: event.data.payload.width ?? 0,
        height: event.data.payload.height ?? 0,
      });
      setRenderError("");
      renderPromise = renderPdfPages(
        event.data.payload.pdfSrc,
        pdfPages,
        event.data.payload.workerSrc ? { workerSrc: event.data.payload.workerSrc } : {},
      ).catch((error: unknown) => {
        setRenderError(error instanceof Error ? error.message : String(error));
        throw error;
      });
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  const applyCrop = async () => {
    await renderPromise;
    const size = pageSize();
    const firstPageCanvas = pdfPages?.querySelector<HTMLCanvasElement>('canvas[data-pdf-page="1"]');

    const message: WebviewToExtensionMessage = {
      type: "apply",
      payload: {
        cropBox: {
          left: 0,
          bottom: 0,
          right: size.width || firstPageCanvas?.width || 0,
          top: size.height || firstPageCanvas?.height || 0,
        },
        target: {
          type: "all",
        },
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
          {fileName()} {currentPage()} / {pageCount()}
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
        <p>現在は表示中ページ全体を全ページへ適用します。</p>

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
