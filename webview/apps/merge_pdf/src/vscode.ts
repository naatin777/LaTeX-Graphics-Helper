import type { WebviewToExtensionMessage } from "./messages";

type VsCodeApi = {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

declare const acquireVsCodeApi: (() => VsCodeApi) | undefined;

function createVsCodeApi(): VsCodeApi {
  if (typeof acquireVsCodeApi === "function") {
    return acquireVsCodeApi();
  }

  // ブラウザで Vite dev / unit test するとき用の fallback。
  return {
    postMessage(message) {
      console.log("[webview mock postMessage]", message);
    },
    getState() {
      return undefined;
    },
    setState() {
      // noop
    },
  };
}

export const vscode = createVsCodeApi();
