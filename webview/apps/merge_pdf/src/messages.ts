export type WebviewToExtensionMessage =
  | {
      type: "applyCrop";
      payload: {
        margin: string;
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
