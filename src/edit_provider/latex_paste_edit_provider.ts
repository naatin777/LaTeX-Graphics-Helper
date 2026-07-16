import path from "node:path";

import * as vscode from "vscode";

import { resolveOutputPath } from "../config/resolve_output_path.js";
import { resolveOutputConflicts } from "../commands/safe_mode.js";
import { rememberLastConversion } from "../commands/undo_last_conversion.js";
import { withCancellationSignal } from "../commands/progress_cancellation.js";
import { localeMap } from "../locale_map.js";
import { userMessage } from "../commands/user_messages.js";
import type { CommittedConversionOutput } from "../operations/commit_conversion_outputs.js";
import type { OutputConflictDecision } from "../operations/commit_conversion_outputs.js";
import type { LineOutputChannel } from "../operations/external_tool_ascii_scratch.js";
import {
  cleanupClipboardSourceArtifact,
  saveClipboardImage,
  type ClipboardImageData,
  type ClipboardPasteKind,
} from "../operations/save_clipboard_image.js";
import { escapeLatex, escapeLatexLabel } from "./latex_escape.js";
import { readLatexInsertionConfig, type LatexInsertionConfig } from "./latex_config.js";
import { LatexSnippet } from "./latex_snippet.js";

const CLIPBOARD_IMAGE_TYPES = [
  { mime: "image/png", ext: "png" },
  { mime: "image/jpeg", ext: "jpeg" },
] as const;

type PasteKind = ClipboardPasteKind;

interface PasteQuickPickItem extends vscode.QuickPickItem {
  pasteKind: PasteKind;
}

export interface LatexPasteEditProviderOptions {
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  rememberLastConversion?: (outputs: CommittedConversionOutput[]) => Promise<string>;
  outputChannel?: LineOutputChannel;
}

export class LatexPasteEditProvider implements vscode.DocumentPasteEditProvider {
  private readonly resolveConflicts: (conflicts: string[]) => Promise<OutputConflictDecision>;
  private readonly rememberConversion: (outputs: CommittedConversionOutput[]) => Promise<string>;
  private readonly outputChannel: LineOutputChannel | undefined;

  constructor(options: LatexPasteEditProviderOptions = {}) {
    this.resolveConflicts = options.resolveOutputConflicts ?? resolveOutputConflicts;
    this.outputChannel = options.outputChannel;
    this.rememberConversion =
      options.rememberLastConversion ??
      ((outputs) => rememberLastConversion(outputs, this.outputChannel));
  }

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

    try {
      return await withCancellationSignal(token, async (signal) => {
        const pasteAsPdfLabel = localeMap("pasteAsPdfLabel");
        const pasteAsImageLabel = localeMap("pasteAsImageLabel");
        const pickedItem = await vscode.window.showQuickPick<PasteQuickPickItem>([
          {
            label: pasteAsPdfLabel,
            detail: localeMap("pasteAsPdfDetail"),
            description: `(${localeMap("builtIn")})`,
            pasteKind: "pdf",
          },
          {
            label: pasteAsImageLabel,
            detail: localeMap("pasteAsImageDetail"),
            description: `(${localeMap("builtIn")})`,
            pasteKind: "image",
          },
        ]);

        signal.throwIfAborted();

        if (!pickedItem) {
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

        signal.throwIfAborted();

        if (!inputOutputPath) {
          return undefined;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const outputPath = resolveUserOutputBasePath(inputOutputPath, workspacePath);
        let undoRecorded = false;
        const saved = await saveClipboardImage(
          {
            data,
            kind: pickedItem.pasteKind,
            outputBasePath: outputPath,
            workspacePath,
          },
          {
            signal,
            resolveConflicts: this.resolveConflicts,
            ...(this.outputChannel !== undefined && { outputChannel: this.outputChannel }),
          },
        );

        try {
          try {
            await this.rememberConversion(saved.outputs);
            undoRecorded = true;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await vscode.window.showWarningMessage(
              userMessage("message.clipboardPaste.undoUnavailable", message),
            );
          }

          signal.throwIfAborted();
          const outputFilePath = saved.outputs[0]?.outputPath;

          if (!outputFilePath) {
            throw new Error("Clipboard paste did not produce an output file.");
          }

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
        } finally {
          await cleanupClipboardSourceArtifact(
            saved,
            undoRecorded,
            this.outputChannel === undefined ? undefined : { outputChannel: this.outputChannel },
          );
        }
      });
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }

      this.outputChannel?.appendLine("[clipboard-paste] cancellation requested");
      return undefined;
    }
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
