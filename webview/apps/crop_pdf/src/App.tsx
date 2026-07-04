import { createSignal, onCleanup, onMount } from "solid-js";

import { renderFirstPdfPage } from "../../../shared/pdf/render_first_page";

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { vscode } from "./vscode";

export function App() {
  const [fileName, setFileName] = createSignal("");
  const [pageCount, setPageCount] = createSignal(1);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal({ width: 0, height: 0 });
  let pdfCanvas: HTMLCanvasElement | undefined;
  let renderPromise: Promise<void> | undefined;

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type !== "init" || !pdfCanvas) {
        return;
      }

      setFileName(event.data.payload.fileName);
      setPageCount(event.data.payload.pageCount);
      setCurrentPage(event.data.payload.initialPage);
      setPageSize({
        width: event.data.payload.width ?? 0,
        height: event.data.payload.height ?? 0,
      });
      renderPromise = renderFirstPdfPage(event.data.payload.pdfSrc, pdfCanvas);
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ type: "ready" });
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  const applyCrop = async () => {
    await renderPromise;
    const size = pageSize();

    const message: WebviewToExtensionMessage = {
      type: "apply",
      payload: {
        cropBox: {
          left: 0,
          bottom: 0,
          right: size.width || pdfCanvas?.width || 0,
          top: size.height || pdfCanvas?.height || 0,
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
        <canvas ref={(element) => (pdfCanvas = element)} data-pdf-page="1" />
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
