import * as vscode from 'vscode';

import * as commands from './commands';
import { LatexDropEditProvider } from './latex_code_generator/latex_drop_edit_provider';
import { LatexPasteEditProvider } from './latex_code_generator/latex_paste_edit_provider';
import { logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
	const secretStorage = context.secrets;

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.cropPdf', commands.runCropPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.splitPdf', commands.runSplitPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.mergePdf', commands.runMergePdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertDrawioToPdf', commands.runConvertDrawioToPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToPng', commands.runConvertPdfToPngCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToJpeg', commands.runConvertPdfToJpegCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToSvg', commands.runConvertPdfToSvgCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertPngToPdf', commands.runConvertPngToPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertJpegToPdf', commands.runConvertJpegToPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.convertSvgToPdf', commands.runConvertSvgToPdfCommand),
		vscode.commands.registerCommand('latex-graphics-helper.setGeminiApiKey', () => commands.setGeminiApiKey(secretStorage)),
		vscode.commands.registerCommand('latex-graphics-helper.deleteGeminiApiKey', () => commands.deleteGeminiApiKey(secretStorage)),
		vscode.languages.registerDocumentDropEditProvider(
			{ language: 'latex' },
			new LatexDropEditProvider(),
			{
				dropMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
				providedDropEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
			}
		),
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'latex' },
			new LatexPasteEditProvider(secretStorage),
			{
				pasteMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
				providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
			}
		),
	);

	logger.info('LaTeX Graphics Helper activated');
}

export function deactivate() { }
