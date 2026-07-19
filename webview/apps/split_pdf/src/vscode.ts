import type { WebviewToExtensionMessage } from './messages';

type VsCodeApi = {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
};

declare const acquireVsCodeApi: (() => VsCodeApi) | undefined;

function createVsCodeApi(): VsCodeApi {
  if (typeof acquireVsCodeApi === 'function') {
    return acquireVsCodeApi();
  }

  return {
    postMessage(message) {
      void message;
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
