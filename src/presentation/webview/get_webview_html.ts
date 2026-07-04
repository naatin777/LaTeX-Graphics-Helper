import * as vscode from "vscode";

export function getWebviewHtml(params: {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  title: string;
  appName: string;
}): string {
  const { webview, extensionUri, title, appName } = params;

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "webview", appName, "index.js"),
  );

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "webview", appName, "index.css"),
  );

  const nonce = getNonce();

  return /* html */ `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8">

    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        connect-src ${webview.cspSource};
        img-src ${webview.cspSource} data: blob:;
        font-src ${webview.cspSource};
        style-src ${webview.cspSource};
        worker-src ${webview.cspSource} blob:;
        script-src 'nonce-${nonce}' ${webview.cspSource};
      "
    >

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <link href="${styleUri}" rel="stylesheet">

    <title>${escapeHtml(title)}</title>
  </head>

  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";

  for (let i = 0; i < 32; i++) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
