/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";

import * as vscode from "vscode";

import { getWebviewHtml } from "../src/presentation/webview/get_webview_html.js";

suite("Webview HTML生成", () => {
  test("PDF.jsがPDFとworkerを読み込めるCSPを含める", () => {
    const webview = {
      cspSource: "vscode-resource:",
      asWebviewUri(uri: vscode.Uri): vscode.Uri {
        return uri;
      },
    } as vscode.Webview;

    const html = getWebviewHtml({
      webview,
      extensionUri: vscode.Uri.file("/extension"),
      title: "Crop PDF",
      appName: "crop_pdf",
    });

    assert.match(html, /connect-src vscode-resource: data: blob:/);
    assert.match(html, /font-src vscode-resource: data: blob:/);
    assert.match(html, /img-src vscode-resource: data: blob:/);
    assert.match(html, /script-src 'nonce-[^']+' vscode-resource:/);
    assert.match(html, /style-src vscode-resource: 'unsafe-inline'/);
    assert.match(html, /worker-src vscode-resource: blob:/);
  });
});
