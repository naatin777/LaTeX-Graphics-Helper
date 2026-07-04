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
        target: {
          type: "all";
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
