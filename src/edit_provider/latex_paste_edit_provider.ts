import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import { localeMap } from "../locale_map.js";
import { convertPngToPdf } from "../operations/convert_png_to_pdf.js";
import { assertWritablePathInWorkspace } from "../security/workspace_path.js";
import { escapeLatex, escapeLatexLabel } from "./latex_escape.js";
import { readLatexInsertionConfig, type LatexInsertionConfig } from "./latex_config.js";
import { LatexSnippet } from "./latex_snippet.js";

const CLIPBOARD_IMAGE_TYPES = [
  { mime: "image/png", ext: "png" },
  { mime: "image/jpeg", ext: "jpeg" },
] as const;

type ClipboardImageType = (typeof CLIPBOARD_IMAGE_TYPES)[number];

interface ClipboardImageData {
  type: ClipboardImageType;
  buffer: Buffer;
}

export class LatexPasteEditProvider implements vscode.DocumentPasteEditProvider {
  async provideDocumentPasteEdits(
    document: vscode.TextDocument,
    _ranges: readonly vscode.Range[],
    dataTransfer: vscode.DataTransfer,
    _context: vscode.DocumentPasteEditContext,
    token: vscode.CancellationToken,
    config: LatexInsertionConfig = readLatexInsertionConfig(),
  ): Promise<vscode.DocumentPasteEdit[] | undefined> {
    const data = await readClipboardImageData(dataTransfer);

    if (!data || token.isCancellationRequested) {
      return undefined;
    }

    const pasteAsPdfLabel = localeMap("pasteAsPdfLabel");
    const pasteAsImageLabel = localeMap("pasteAsImageLabel");
    const pickedItem = await vscode.window.showQuickPick([
      {
        label: pasteAsPdfLabel,
        detail: localeMap("pasteAsPdfDetail"),
        description: `(${localeMap("builtIn")})`,
      },
      {
        label: pasteAsImageLabel,
        detail: localeMap("pasteAsImageDetail"),
        description: `(${localeMap("builtIn")})`,
      },
    ]);

    if (!pickedItem || token.isCancellationRequested) {
      return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
      return undefined;
    }

    const defaultOutputPath = resolveOutputPath(config.outputPathClipboardImage, {
      workspacePath: workspaceFolder.uri.fsPath,
      workspaceName: workspaceFolder.name,
      sourcePath: document.uri.fsPath,
    });
    const inputOutputPath = await vscode.window.showInputBox(
      {
        title: localeMap("pasteOutputPathTitle"),
        prompt: localeMap("pasteOutputPathPrompt"),
        value: defaultOutputPath,
        validateInput: (value) => validateOutputBasePath(value, workspaceFolder.uri.fsPath),
      },
      token,
    );

    if (!inputOutputPath || token.isCancellationRequested) {
      return undefined;
    }

    const outputPath = resolveUserOutputBasePath(inputOutputPath, workspaceFolder.uri.fsPath);
    const outputFilePath = isPasteAsPdf(pickedItem.label, pasteAsPdfLabel)
      ? await writeClipboardImageAsPdf(data, outputPath, workspaceFolder.uri.fsPath)
      : await writeClipboardImage(data, outputPath, workspaceFolder.uri.fsPath);
    const relativeFilePath = path.relative(path.dirname(document.uri.fsPath), outputFilePath);
    const basename = path.basename(outputFilePath, path.extname(outputFilePath));
    const snippet = this.createSingleFileSnippet(config, basename, relativeFilePath);

    return [
      new vscode.DocumentPasteEdit(
        snippet,
        pickedItem.label,
        vscode.DocumentDropOrPasteEditKind.Empty,
      ),
    ];
  }

  createSingleFileSnippet(
    config: LatexInsertionConfig,
    fileName: string,
    relativeFilePath: string,
  ): vscode.SnippetString {
    const snippet = new LatexSnippet(config);

    snippet.wrapEnvironment("figure", () => {
      snippet.appendFigurePlacement().lineBreak();
      snippet.appendFigureAlignment().lineBreak();
      snippet
        .appendCommand(
          "includegraphics",
          () => snippet.appendGraphicsOptions(),
          () => snippet.appendText(snippet.convertToLatexPath(relativeFilePath)),
        )
        .lineBreak();
      snippet
        .appendCommand("caption", undefined, () => snippet.appendPlaceholder(escapeLatex(fileName)))
        .appendCommand("label", undefined, () => {
          snippet.appendText("fig:").appendPlaceholder(escapeLatexLabel(fileName));
        })
        .lineEnd();
    });

    return snippet.snippet;
  }
}

async function readClipboardImageData(
  dataTransfer: vscode.DataTransfer,
): Promise<ClipboardImageData | undefined> {
  for (const type of CLIPBOARD_IMAGE_TYPES) {
    const file = dataTransfer.get(type.mime)?.asFile();
    const data = await file?.data();

    if (data) {
      return { type, buffer: Buffer.from(data) };
    }
  }

  return undefined;
}

async function writeClipboardImage(
  data: ClipboardImageData,
  outputPath: string,
  workspacePath: string,
): Promise<string> {
  const outputFilePath = appendExtension(outputPath, data.type.ext);
  await assertWritablePathInWorkspace(outputFilePath, workspacePath);
  await mkdir(path.dirname(outputFilePath), { recursive: true });
  await writeFile(outputFilePath, data.buffer);
  return outputFilePath;
}

async function writeClipboardImageAsPdf(
  data: ClipboardImageData,
  outputPath: string,
  workspacePath: string,
): Promise<string> {
  const imagePath = await writeClipboardImage(data, outputPath, workspacePath);
  const pdfPath = appendExtension(outputPath, "pdf");

  try {
    await convertPngToPdf({
      sourcePath: imagePath,
      outputPath: pdfPath,
      workspacePath,
    });
  } finally {
    await rm(imagePath, { force: true });
  }

  return pdfPath;
}

function isPasteAsPdf(label: string, localizedPdfLabel: string): boolean {
  return label === localizedPdfLabel || label === "PDF形式で貼り付け";
}

function resolveUserOutputBasePath(value: string, workspacePath: string): string {
  const trimmedValue = value.trim();
  return path.isAbsolute(trimmedValue)
    ? path.normalize(trimmedValue)
    : path.resolve(workspacePath, trimmedValue);
}

function validateOutputBasePath(value: string, workspacePath: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return localeMap("pasteOutputPathEmpty");
  }

  const outputPath = resolveUserOutputBasePath(trimmedValue, workspacePath);
  const relativePath = path.relative(workspacePath, outputPath);

  if (
    relativePath === ".." ||
    path.isAbsolute(relativePath) ||
    relativePath.startsWith(`..${path.sep}`)
  ) {
    return localeMap("pasteOutputPathOutsideWorkspace");
  }

  return undefined;
}

function appendExtension(outputPath: string, extension: string): string {
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  const currentExtension = path.extname(outputPath).toLowerCase();

  if (
    currentExtension === normalizedExtension ||
    (normalizedExtension === ".jpeg" && currentExtension === ".jpg")
  ) {
    return outputPath;
  }

  return `${outputPath}${normalizedExtension}`;
}
