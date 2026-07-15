import * as vscode from "vscode";

import { convertToAvifCommand, CONVERT_TO_AVIF_COMMAND } from "./commands/convert_to_avif.js";
import { cropPdfAuto, CROP_PDF_AUTO_COMMAND } from "./commands/crop_pdf_auto.js";
import {
  cropPdfConfigureCommand,
  CROP_PDF_CONFIGURE_COMMAND,
} from "./commands/crop_pdf_configure.js";
import { convertToJpegCommand, CONVERT_TO_JPEG_COMMAND } from "./commands/convert_to_jpeg.js";
import { convertToPngCommand, CONVERT_TO_PNG_COMMAND } from "./commands/convert_to_png.js";
import { convertToSvgCommand, CONVERT_TO_SVG_COMMAND } from "./commands/convert_to_svg.js";
import { convertToWebpCommand, CONVERT_TO_WEBP_COMMAND } from "./commands/convert_to_webp.js";
import {
  convertToPdfCommand,
  convertPngToPdfCommand,
  CONVERT_TO_PDF_COMMAND,
  CONVERT_PNG_TO_PDF_COMMAND,
} from "./commands/convert_png_to_pdf.js";
import {
  mergePdfSelectedFilesCommand,
  MERGE_PDF_SELECTED_FILES_COMMAND,
} from "./commands/merge_pdf.js";
import { initializeSafeMode, TOGGLE_SAFE_MODE_COMMAND } from "./commands/safe_mode.js";
import {
  splitPdfAllPagesCommand,
  SPLIT_PDF_ALL_PAGES_COMMAND,
} from "./commands/split_pdf_all_pages.js";
import {
  undoLastConversion,
  UNDO_LAST_CONVERSION_COMMAND,
} from "./commands/undo_last_conversion.js";
import { LatexDropEditProvider } from "./edit_provider/latex_drop_edit_provider.js";
import { LatexPasteEditProvider } from "./edit_provider/latex_paste_edit_provider.js";

const latexDocumentSelector: vscode.DocumentSelector = [{ language: "latex" }, { language: "tex" }];

export const PUBLIC_COMMAND_IDS = [
  CROP_PDF_AUTO_COMMAND,
  CROP_PDF_CONFIGURE_COMMAND,
  SPLIT_PDF_ALL_PAGES_COMMAND,
  MERGE_PDF_SELECTED_FILES_COMMAND,
  UNDO_LAST_CONVERSION_COMMAND,
  CONVERT_TO_PDF_COMMAND,
  CONVERT_TO_PNG_COMMAND,
  CONVERT_TO_JPEG_COMMAND,
  CONVERT_TO_WEBP_COMMAND,
  CONVERT_TO_AVIF_COMMAND,
  CONVERT_TO_SVG_COMMAND,
  TOGGLE_SAFE_MODE_COMMAND,
] as const;

export const INTERNAL_COMMAND_IDS = [CONVERT_PNG_TO_PDF_COMMAND] as const;
export const REGISTERED_COMMAND_IDS = [...PUBLIC_COMMAND_IDS, ...INTERNAL_COMMAND_IDS] as const;

interface CommandRegistration {
  id: string;
  register: () => vscode.Disposable;
}

function commandRegistrations(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): CommandRegistration[] {
  return [
    {
      id: CROP_PDF_AUTO_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CROP_PDF_AUTO_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => cropPdfAuto(uri, uris, outputChannel),
        ),
    },
    {
      id: CROP_PDF_CONFIGURE_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CROP_PDF_CONFIGURE_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
            cropPdfConfigureCommand(context, uri, uris, outputChannel),
        ),
    },
    {
      id: SPLIT_PDF_ALL_PAGES_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          SPLIT_PDF_ALL_PAGES_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
            splitPdfAllPagesCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: MERGE_PDF_SELECTED_FILES_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          MERGE_PDF_SELECTED_FILES_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
            mergePdfSelectedFilesCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: UNDO_LAST_CONVERSION_COMMAND,
      register: () =>
        vscode.commands.registerCommand(UNDO_LAST_CONVERSION_COMMAND, (expectedId?: string) =>
          undoLastConversion(expectedId, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_PDF_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_PDF_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToPdfCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_PNG_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_PNG_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToPngCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_JPEG_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_JPEG_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToJpegCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_WEBP_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_WEBP_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToWebpCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_AVIF_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_AVIF_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToAvifCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_TO_SVG_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_TO_SVG_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) => convertToSvgCommand(uri, uris, outputChannel),
        ),
    },
    {
      id: CONVERT_PNG_TO_PDF_COMMAND,
      register: () =>
        vscode.commands.registerCommand(
          CONVERT_PNG_TO_PDF_COMMAND,
          (uri?: vscode.Uri, uris?: vscode.Uri[]) =>
            convertPngToPdfCommand(uri, uris, outputChannel),
        ),
    },
  ];
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  initializeSafeMode(context);
  const outputChannel = vscode.window.createOutputChannel("LaTeX Graphics Helper");
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    ...commandRegistrations(context, outputChannel).map(({ register }) => register()),
    vscode.languages.registerDocumentDropEditProvider(
      latexDocumentSelector,
      new LatexDropEditProvider(),
      {
        dropMimeTypes: ["text/uri-list"],
      },
    ),
    vscode.languages.registerDocumentPasteEditProvider(
      latexDocumentSelector,
      new LatexPasteEditProvider({ outputChannel }),
      {
        providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
        pasteMimeTypes: ["image/png", "image/jpeg"],
      },
    ),
  );
}
