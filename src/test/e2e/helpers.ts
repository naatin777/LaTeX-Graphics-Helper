import * as assert from 'node:assert';

import { PDFDocument, rgb } from 'pdf-lib';
import * as vscode from 'vscode';

export function getTestWorkspaceFolder(): vscode.WorkspaceFolder {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected vscode-test to open a workspace folder');
    return workspaceFolder;
}

export async function createTestDirectory(name: string): Promise<vscode.Uri> {
    const workspaceFolder = getTestWorkspaceFolder();
    const safeName = name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    const directory = vscode.Uri.joinPath(
        workspaceFolder.uri,
        `${safeName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );

    await vscode.workspace.fs.createDirectory(directory);
    return directory;
}

export async function deleteDirectory(uri: vscode.Uri): Promise<void> {
    try {
        await vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false });
    } catch {
        // Best-effort cleanup for test-generated files.
    }
}

export async function createPdf(fileUri: vscode.Uri, pageCount: number): Promise<void> {
    const document = await PDFDocument.create();

    for (let i = 0; i < pageCount; i++) {
        const page = document.addPage([200, 100]);
        page.drawText(`Page ${i + 1}`, {
            x: 20,
            y: 45,
            size: 16,
            color: rgb(0, 0, 0),
        });
    }

    await vscode.workspace.fs.writeFile(fileUri, await document.save());
}

export async function createPng(fileUri: vscode.Uri): Promise<void> {
    const pngBytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l0ud5AAAAABJRU5ErkJggg==',
        'base64',
    );

    await vscode.workspace.fs.writeFile(fileUri, pngBytes);
}

export async function readPdfPageCount(fileUri: vscode.Uri): Promise<number> {
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    const pdf = await PDFDocument.load(bytes);
    return pdf.getPageCount();
}

export async function waitForFile(fileUri: vscode.Uri, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            await vscode.workspace.fs.stat(fileUri);
            return;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    assert.fail(`Timed out waiting for file: ${fileUri.fsPath}`);
}
