import * as vscode from 'vscode';

import { getOutputPathCropPdf, getOutputPathConvertPdfToPng, getOutputPathConvertPdfToJpeg, getOutputPathConvertPdfToSvg, getPdftocairoPngOptions, getPdftocairoJpegOptions, getPdftocairoSvgOptions, getOutputPathConvertPngToPdf, getOutputPathConvertJpegToPdf, getOutputPathConvertSvgToPdf, getOutputPathConvertDrawioToPdf } from './configuration';
import { convertDrawioToPdf } from './context_menu/convert_drawio_to_pdf';
import { convertImageToPdf } from './context_menu/convert_image_to_pdf';
import { convertPdfToImage } from './context_menu/convert_pdf_to_image';
import { cropPdf } from './context_menu/crop_pdf';
import { runExplorerContextItem } from './context_menu/run_context_menu_item';
import { splitPdf } from './context_menu/split_pdf';
import { deleteGeminiApiKey, storeGeminiApiKey } from './gemini/gemini_api_key';
import { LatexDropEditProvider } from './latex_code_generator/latex_drop_edit_provider';
import { LatexPasteEditProvider } from './latex_code_generator/latex_paste_edit_provider';
import { localeMap } from './locale_map';

export function activate(context: vscode.ExtensionContext) {
	const secretStorage = context.secrets;

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.cropPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('cropPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				cropPdf(uri.fsPath, getOutputPathCropPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.splitPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('splitPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				splitPdf(uri.fsPath, getOutputPathCropPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertDrawioToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertDrawioToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				await convertDrawioToPdf(uri.fsPath, getOutputPathConvertDrawioToPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToPng', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToPngProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri.fsPath, getOutputPathConvertPdfToPng(), workspaceFolder, getPdftocairoPngOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToJpeg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToJpegProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri.fsPath, getOutputPathConvertPdfToJpeg(), workspaceFolder, getPdftocairoJpegOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToSvg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToSvgProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri.fsPath, getOutputPathConvertPdfToSvg(), workspaceFolder, getPdftocairoSvgOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPngToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPngToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri.fsPath, getOutputPathConvertPngToPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertJpegToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertJpegToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri.fsPath, getOutputPathConvertJpegToPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertSvgToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertSvgToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri.fsPath, getOutputPathConvertSvgToPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentDropEditProvider(
			{ language: 'latex' },
			new LatexDropEditProvider(),
		)
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'latex' },
			new LatexPasteEditProvider(secretStorage),
			{
				pasteMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
				providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.setGeminiApiKey', async () => {
			const apiKey = await vscode.window.showInputBox({
				password: true,
				title: localeMap('enterGeminiApiKey'),
			});
			if (apiKey) {
				await storeGeminiApiKey(secretStorage, apiKey);
				vscode.window.showInformationMessage(localeMap('storedGeminiApiKey'));
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.deleteGeminiApiKey', async () => {
			await deleteGeminiApiKey(secretStorage);
			vscode.window.showInformationMessage(localeMap('deletedGeminiApiKey'));
		})
	);
}

export function deactivate() { }
