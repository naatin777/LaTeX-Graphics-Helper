export type WebviewToExtensionMessage =
  | {
      type: "ready";
    }
  | {
      type: "apply";
      payload: {
        cropBox: {
          left: number;
          bottom: number;
          right: number;
          top: number;
        };
        target:
          | {
              type: "all";
            }
          | {
              type: "selected";
              pages: number[];
            };
      };
    }
  | {
      type: "cancel";
    };

export type ExtensionToWebviewMessage =
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
      };
    }
  | {
      type: "setInitialState";
      payload: {
        margin: string;
      };
    }
  | {
      type: "error";
      payload: {
        message: string;
      };
    };
