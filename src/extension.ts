import * as vscode from 'vscode';

import type { CommandDependencies } from './commands/command_dependencies.js';
import {
  convertToPdfCommand,
  convertPngToPdfCommand,
  CONVERT_TO_PDF_COMMAND,
  CONVERT_PNG_TO_PDF_COMMAND,
} from './commands/convert_png_to_pdf.js';
import {
  convertDrawioToPdfCommand,
  convertDrawioToPdfDirectlyCommand,
  CONVERT_DRAWIO_TO_PDF_COMMAND,
  CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND,
} from './commands/convert_drawio_to_pdf.js';
import { convertToAvifCommand, CONVERT_TO_AVIF_COMMAND } from './commands/convert_to_avif.js';
import { convertToJpegCommand, CONVERT_TO_JPEG_COMMAND } from './commands/convert_to_jpeg.js';
import { convertToPngCommand, CONVERT_TO_PNG_COMMAND } from './commands/convert_to_png.js';
import { convertToSvgCommand, CONVERT_TO_SVG_COMMAND } from './commands/convert_to_svg.js';
import { convertToWebpCommand, CONVERT_TO_WEBP_COMMAND } from './commands/convert_to_webp.js';
import { cropPdfAuto, CROP_PDF_AUTO_COMMAND } from './commands/crop_pdf_auto.js';
import { cropPdfConfigureCommand, CROP_PDF_CONFIGURE_COMMAND } from './commands/crop_pdf_configure.js';
import {
  mergePdfConfigureCommand,
  mergePdfSelectedFilesCommand,
  MERGE_PDF_CONFIGURE_COMMAND,
  MERGE_PDF_SELECTED_FILES_COMMAND,
} from './commands/merge_pdf.js';
import { initializeSafeMode, TOGGLE_SAFE_MODE_COMMAND } from './commands/safe_mode.js';
import {
  splitPdfAllPagesCommand,
  splitPdfConfigureCommand,
  SPLIT_PDF_ALL_PAGES_COMMAND,
  SPLIT_PDF_CONFIGURE_COMMAND,
} from './commands/split_pdf_all_pages.js';
import { undoLastConversion, UNDO_LAST_CONVERSION_COMMAND } from './commands/undo_last_conversion.js';
import { LatexDropEditProvider } from './edit_provider/latex_drop_edit_provider.js';
import { LatexPasteEditProvider } from './edit_provider/latex_paste_edit_provider.js';

const latexDocumentSelector: vscode.DocumentSelector = [{ language: 'latex' }, { language: 'tex' }];

export const PUBLIC_COMMAND_IDS = [
  CROP_PDF_AUTO_COMMAND,
  CROP_PDF_CONFIGURE_COMMAND,
  SPLIT_PDF_ALL_PAGES_COMMAND,
  SPLIT_PDF_CONFIGURE_COMMAND,
  MERGE_PDF_SELECTED_FILES_COMMAND,
  MERGE_PDF_CONFIGURE_COMMAND,
  UNDO_LAST_CONVERSION_COMMAND,
  CONVERT_TO_PDF_COMMAND,
  CONVERT_DRAWIO_TO_PDF_COMMAND,
  CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND,
  CONVERT_TO_PNG_COMMAND,
  CONVERT_TO_JPEG_COMMAND,
  CONVERT_TO_WEBP_COMMAND,
  CONVERT_TO_AVIF_COMMAND,
  CONVERT_TO_SVG_COMMAND,
  TOGGLE_SAFE_MODE_COMMAND,
] as const;

export const INTERNAL_COMMAND_IDS = [CONVERT_PNG_TO_PDF_COMMAND] as const;
export const REGISTERED_COMMAND_IDS = [...PUBLIC_COMMAND_IDS, ...INTERNAL_COMMAND_IDS] as const;

type FileCommandHandler = (uri?: vscode.Uri, uris?: vscode.Uri[]) => Promise<void>;

function registerFileCommand(context: vscode.ExtensionContext, id: string, handler: FileCommandHandler): void {
  context.subscriptions.push(vscode.commands.registerCommand(id, handler));
}

function registerCommands(context: vscode.ExtensionContext, dependencies: CommandDependencies): void {
  registerFileCommand(context, CROP_PDF_AUTO_COMMAND, (uri, uris) => cropPdfAuto(uri, uris, dependencies));
  registerFileCommand(context, CROP_PDF_CONFIGURE_COMMAND, (uri, uris) =>
    cropPdfConfigureCommand(context, uri, uris, dependencies),
  );
  registerFileCommand(context, SPLIT_PDF_ALL_PAGES_COMMAND, (uri, uris) =>
    splitPdfAllPagesCommand(uri, uris, dependencies),
  );
  registerFileCommand(context, SPLIT_PDF_CONFIGURE_COMMAND, (uri, uris) =>
    splitPdfConfigureCommand(context, uri, uris, dependencies),
  );
  registerFileCommand(context, MERGE_PDF_SELECTED_FILES_COMMAND, (uri, uris) =>
    mergePdfSelectedFilesCommand(uri, uris, dependencies),
  );
  registerFileCommand(context, MERGE_PDF_CONFIGURE_COMMAND, (uri, uris) =>
    mergePdfConfigureCommand(context, uri, uris, dependencies),
  );
  registerFileCommand(context, CONVERT_TO_PDF_COMMAND, (uri, uris) => convertToPdfCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_DRAWIO_TO_PDF_COMMAND, (uri, uris) =>
    convertDrawioToPdfCommand(uri, uris, dependencies),
  );
  registerFileCommand(context, CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND, (uri, uris) =>
    convertDrawioToPdfDirectlyCommand(uri, uris, dependencies),
  );
  registerFileCommand(context, CONVERT_TO_PNG_COMMAND, (uri, uris) => convertToPngCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_TO_JPEG_COMMAND, (uri, uris) => convertToJpegCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_TO_WEBP_COMMAND, (uri, uris) => convertToWebpCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_TO_AVIF_COMMAND, (uri, uris) => convertToAvifCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_TO_SVG_COMMAND, (uri, uris) => convertToSvgCommand(uri, uris, dependencies));
  registerFileCommand(context, CONVERT_PNG_TO_PDF_COMMAND, (uri, uris) =>
    convertPngToPdfCommand(uri, uris, dependencies),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(UNDO_LAST_CONVERSION_COMMAND, (expectedId?: string) =>
      undoLastConversion(expectedId, dependencies),
    ),
  );
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  initializeSafeMode(context);
  const outputChannel = vscode.window.createOutputChannel('LaTeX Graphics Helper');
  const dependencies = { outputChannel } satisfies CommandDependencies;
  context.subscriptions.push(outputChannel);

  registerCommands(context, dependencies);
  context.subscriptions.push(
    vscode.languages.registerDocumentDropEditProvider(latexDocumentSelector, new LatexDropEditProvider(), {
      dropMimeTypes: ['text/uri-list'],
    }),
    vscode.languages.registerDocumentPasteEditProvider(
      latexDocumentSelector,
      new LatexPasteEditProvider({ outputChannel }),
      {
        providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
        pasteMimeTypes: ['image/png', 'image/jpeg'],
      },
    ),
  );
}
