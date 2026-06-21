import { createSignal, onCleanup, onMount } from "solid-js";

import { renderFirstPdfPage } from "../../../shared/pdf/render_first_page";

import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "./messages";
import { vscode } from "./vscode";

export function App() {
  const [margin, setMargin] = createSignal("0");
  let pdfCanvas: HTMLCanvasElement | undefined;

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type !== "init" || !pdfCanvas) {
        return;
      }

      void renderFirstPdfPage(event.data.payload.pdfSrc, pdfCanvas);
    };

    window.addEventListener("message", handleMessage);
    onCleanup(() => window.removeEventListener("message", handleMessage));
  });

  const applyCrop = () => {
    const message: WebviewToExtensionMessage = {
      type: "applyCrop",
      payload: {
        margin: margin(),
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
      </header>

      <section class="pdf-preview">
        <canvas ref={(element) => (pdfCanvas = element)} data-pdf-page="1" />
      </section>

      <section class="panel">
        <label class="field">
          <span class="field__label">Margin</span>
          <input
            class="input"
            value={margin()}
            onInput={(event) => setMargin(event.currentTarget.value)}
            placeholder="0"
          />
        </label>

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
