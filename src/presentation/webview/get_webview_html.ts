import { randomBytes } from 'node:crypto';

import * as vscode from 'vscode';

export function getWebviewHtml(params: {
  webview: vscode.Webview;
  extensionUri: vscode.Uri;
  title: string;
  appName: string;
  locale?: string;
}): string {
  const { webview, extensionUri, title, appName, locale = vscode.env.language } = params;

  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview', appName, 'index.js'));

  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview', appName, 'index.css'));

  const nonce = getNonce();

  return /* html */ `<!doctype html>
<html lang="${escapeHtml(locale)}">
  <head>
    <meta charset="UTF-8">

    <meta
      http-equiv="Content-Security-Policy"
      content="
        default-src 'none';
        connect-src ${webview.cspSource} data: blob:;
        img-src ${webview.cspSource} data: blob:;
        font-src ${webview.cspSource} data: blob:;
        style-src ${webview.cspSource} 'unsafe-inline';
        worker-src ${webview.cspSource} blob:;
        script-src 'nonce-${nonce}';
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
  return randomBytes(16).toString('base64');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
