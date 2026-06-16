import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PDFDocument, rgb } from 'pdf-lib';
import * as vscode from 'vscode';

import { logger } from '../../logger';
import type { PasteClipboardImageAs } from '../../type';

const DARWIN_DRAWIO_EXECUTABLE = '/Applications/draw.io.app/Contents/MacOS/draw.io';

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

export async function createJpeg(fileUri: vscode.Uri): Promise<void> {
    const jpegBytes = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAUGB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQn//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z',
        'base64',
    );

    await vscode.workspace.fs.writeFile(fileUri, jpegBytes);
}

export async function createSvg(fileUri: vscode.Uri): Promise<void> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="green"/></svg>`;
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(svg, 'utf8'));
}

export async function copyFixture(relativePath: string, destinationUri: vscode.Uri): Promise<void> {
    const workspaceFolder = getTestWorkspaceFolder();
    const sourceUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    const bytes = await vscode.workspace.fs.readFile(sourceUri);
    await vscode.workspace.fs.writeFile(destinationUri, bytes);
}

export async function readPdfPageCount(fileUri: vscode.Uri): Promise<number> {
    const bytes = await vscode.workspace.fs.readFile(fileUri);
    const pdf = await PDFDocument.load(bytes);
    return pdf.getPageCount();
}

export async function waitForFile(fileUri: vscode.Uri, timeoutMs = 30000): Promise<void> {
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

export async function waitForFiles(fileUris: vscode.Uri[], timeoutMs = 30000): Promise<void> {
    await Promise.all(fileUris.map((uri) => waitForFile(uri, timeoutMs)));
}

/**
 * Invokes a command the same way the Explorer context menu does:
 * `executeCommand(commandId, clickedResource, selectedResources)`.
 */
export async function runExplorerContextCommand(
    commandId: string,
    clickedUri: vscode.Uri,
    selectedUris: vscode.Uri[] = [clickedUri],
): Promise<void> {
    await vscode.commands.executeCommand(commandId, clickedUri, selectedUris);
}

export async function configurePredictableOutputPaths(): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const entries: Array<[string, string]> = [
        ['outputPath.cropPdf', '${fileDirname}/${fileBasenameNoExtension}-crop.pdf'],
        ['outputPath.splitPdf', '${fileDirname}/${fileBasenameNoExtension}-${page}.pdf'],
        ['outputPath.convertDrawioToPdf', '${fileDirname}/${fileBasenameNoExtension}/${page}.pdf'],
        ['outputPath.convertPdfToPng', '${fileDirname}/${fileBasenameNoExtension}-${page}.png'],
        ['outputPath.convertPdfToJpeg', '${fileDirname}/${fileBasenameNoExtension}-${page}.jpeg'],
        ['outputPath.convertPdfToSvg', '${fileDirname}/${fileBasenameNoExtension}-${page}.svg'],
        ['outputPath.convertPngToPdf', '${fileDirname}/${fileBasenameNoExtension}.pdf'],
        ['outputPath.convertJpegToPdf', '${fileDirname}/${fileBasenameNoExtension}.pdf'],
        ['outputPath.convertSvgToPdf', '${fileDirname}/${fileBasenameNoExtension}.pdf'],
        ['outputPath.clipboardImage', '${fileDirname}/${fileBasenameNoExtension}-clipboard'],
    ];

    for (const [key, value] of entries) {
        await configuration.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    await configuration.update(
        'pasteClipboardImageAs',
        'pdf',
        vscode.ConfigurationTarget.Workspace,
    );
}

export async function configurePasteClipboardImageAs(mode: PasteClipboardImageAs): Promise<void> {
    await vscode.workspace
        .getConfiguration('latex-graphics-helper')
        .update('pasteClipboardImageAs', mode, vscode.ConfigurationTarget.Workspace);
}

export function clearLogger(): void {
    logger.clear();
}

export function loggerContains(substring: string): boolean {
    return logger.getLines().some((line) => line.includes(substring));
}

export async function restoreDefaultExecPaths(): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
    const keys = ['pdfcrop', 'pdftocairo', 'rsvgConvert', 'drawio'] as const;

    for (const key of keys) {
        await configuration.update(
            `execPath.${key}`,
            undefined,
            vscode.ConfigurationTarget.Workspace,
        );
    }

    const drawioExecutable = resolveDrawioExecutable();
    if (drawioExecutable) {
        await configureDrawioExecutable(drawioExecutable);
    }

    await configureCiExecPathsFromEnv();
}

function collectCiPathExtras(
    ciToolPaths: Partial<Record<'pdfcrop' | 'pdftocairo' | 'rsvgConvert', string>> & {
        gs?: string;
        pathExtra?: string[];
    },
): string[] {
    const directories = new Set<string>();

    for (const directory of ciToolPaths.pathExtra ?? []) {
        if (directory.length > 0) {
            directories.add(directory);
        }
    }

    for (const segment of (process.env.LGH_PATH_EXTRA ?? '').split(path.delimiter)) {
        if (segment.length > 0) {
            directories.add(segment);
        }
    }

    for (const toolPath of [
        ciToolPaths.pdfcrop ?? process.env.LGH_PDFCROP,
        ciToolPaths.pdftocairo ?? process.env.LGH_PDFTOCAIRO,
        ciToolPaths.rsvgConvert ?? process.env.LGH_RSVG_CONVERT,
        ciToolPaths.gs ?? process.env.LGH_GS,
    ]) {
        if (!toolPath || toolPath.length === 0) {
            continue;
        }

        const directory = path.dirname(toolPath);
        if (directory.length > 0 && directory !== '.') {
            directories.add(directory);
        }
    }

    return [...directories];
}

async function configureCiExecPathsFromEnv(): Promise<void> {
    const ciToolPaths = loadCiToolPathsFile();
    const entries: Array<['pdfcrop' | 'pdftocairo' | 'rsvgConvert', string | undefined]> = [
        ['pdfcrop', ciToolPaths.pdfcrop ?? process.env.LGH_PDFCROP],
        ['pdftocairo', ciToolPaths.pdftocairo ?? process.env.LGH_PDFTOCAIRO],
        ['rsvgConvert', ciToolPaths.rsvgConvert ?? process.env.LGH_RSVG_CONVERT],
    ];

    for (const [key, value] of entries) {
        if (value && value.length > 0) {
            await setExecPath(key, value);
        }
    }

    const pathExtra = collectCiPathExtras(ciToolPaths);
    if (pathExtra.length > 0) {
        const prefix = pathExtra.join(path.delimiter);
        process.env.PATH = `${prefix}${path.delimiter}${process.env.PATH ?? ''}`;
    }

    const gsPath = ciToolPaths.gs ?? process.env.LGH_GS;
    if (gsPath && gsPath.length > 0) {
        process.env.LGH_GS = gsPath;
    }
}

function loadCiToolPathsFile(): Partial<
    Record<'pdfcrop' | 'pdftocairo' | 'rsvgConvert', string>
> & {
    gs?: string;
    pathExtra?: string[];
} {
    try {
        const extension = vscode.extensions.getExtension('naatin777.latex-graphics-helper');
        if (!extension) {
            return {};
        }

        const filePath = path.join(extension.extensionPath, '.vscode-test/ci-tool-paths.json');
        if (!fs.existsSync(filePath)) {
            return {};
        }

        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<
            Record<'pdfcrop' | 'pdftocairo' | 'rsvgConvert', string>
        > & {
            gs?: string;
            pathExtra?: string[];
        };
    } catch {
        return {};
    }
}

export function resolveDrawioExecutable(): string | undefined {
    if (os.platform() === 'darwin' && fs.existsSync(DARWIN_DRAWIO_EXECUTABLE)) {
        return DARWIN_DRAWIO_EXECUTABLE;
    }

    const configured = vscode.workspace
        .getConfiguration('latex-graphics-helper')
        .get<string>('execPath.drawio');
    if (configured && configured.length > 0 && fs.existsSync(configured)) {
        return configured;
    }

    return undefined;
}

export async function configureDrawioExecutable(executablePath: string): Promise<void> {
    await vscode.workspace
        .getConfiguration('latex-graphics-helper')
        .update('execPath.drawio', executablePath, vscode.ConfigurationTarget.Workspace);
}

export async function setExecPath(
    key: 'pdfcrop' | 'pdftocairo' | 'rsvgConvert' | 'drawio',
    value: string,
): Promise<void> {
    await vscode.workspace
        .getConfiguration('latex-graphics-helper')
        .update(`execPath.${key}`, value, vscode.ConfigurationTarget.Workspace);
}

/** Wait for fire-and-forget command handlers (withProgress) to finish. */
export async function settleCommandQueue(delayMs = 300): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function errorMessagesFromStub(stub: {
    getCalls: () => Array<{ args: unknown[] }>;
}): string[] {
    return stub.getCalls().map((call) => String(call.args[0]));
}

export async function waitForErrorMessages(
    stub: { getCalls: () => Array<{ args: unknown[] }> },
    count: number,
    timeoutMs = 30000,
): Promise<string[]> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const messages = errorMessagesFromStub(stub);
        if (messages.length >= count) {
            return messages;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    assert.fail(
        `Timed out waiting for ${count} error message(s), got ${errorMessagesFromStub(stub).length}`,
    );
}

export async function createOutsideWorkspaceDirectory(name: string): Promise<{
    directoryUri: vscode.Uri;
    cleanup: () => Promise<void>;
}> {
    const workspaceRoot = getTestWorkspaceFolder().uri.fsPath;
    let directoryPath = path.join(os.tmpdir(), `${name}-${Date.now()}`);

    while (directoryPath.startsWith(workspaceRoot)) {
        directoryPath = path.join(
            os.tmpdir(),
            `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        );
    }

    await fs.promises.mkdir(directoryPath, { recursive: true });
    const directoryUri = vscode.Uri.file(directoryPath);

    return {
        directoryUri,
        cleanup: async () => {
            try {
                await fs.promises.rm(directoryPath, { recursive: true, force: true });
            } catch {
                // Best-effort cleanup for paths outside the vscode-test workspace.
            }
        },
    };
}

export async function createCorruptPdf(fileUri: vscode.Uri): Promise<void> {
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from('not a valid pdf file', 'utf8'));
}

export async function openLatexDocument(documentUri: vscode.Uri): Promise<vscode.TextDocument> {
    return vscode.workspace.openTextDocument(documentUri);
}

export async function applySnippetAt(
    document: vscode.TextDocument,
    position: vscode.Position,
    snippet: vscode.SnippetString,
): Promise<vscode.TextDocument> {
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    const success = await editor.insertSnippet(snippet, position);
    assert.ok(success, 'Expected snippet insertion to succeed');
    await document.save();
    return document;
}

export function uriListDataTransfer(uris: vscode.Uri[]): vscode.DataTransfer {
    const dataTransfer = new vscode.DataTransfer();
    dataTransfer.set(
        'text/uri-list',
        new vscode.DataTransferItem(uris.map((uri) => uri.toString()).join('\r\n')),
    );
    return dataTransfer;
}

export function workspaceFixturePath(...segments: string[]): string {
    return path.join(getTestWorkspaceFolder().uri.fsPath, ...segments);
}

export function pasteEditContext(
    triggerKind: vscode.DocumentPasteTriggerKind = vscode.DocumentPasteTriggerKind.Automatic,
): vscode.DocumentPasteEditContext {
    return {
        only: vscode.DocumentDropOrPasteEditKind.Empty,
        triggerKind,
    };
}

export function clipboardImageDataTransfer(
    mimeType: 'image/png' | 'image/jpeg',
    bytes: Uint8Array,
    fileName: string,
): vscode.DataTransfer {
    const dataTransfer = new vscode.DataTransfer();
    dataTransfer.set(mimeType, {
        asString: async () => '',
        asFile: () => ({
            name: fileName,
            data: async () => bytes,
        }),
        value: bytes,
    } as vscode.DataTransferItem);
    return dataTransfer;
}

export async function readDocumentText(documentUri: vscode.Uri): Promise<string> {
    const document = await vscode.workspace.openTextDocument(documentUri);
    return document.getText();
}

export async function fileByteLength(fileUri: vscode.Uri): Promise<number> {
    const stat = await vscode.workspace.fs.stat(fileUri);
    return stat.size;
}
