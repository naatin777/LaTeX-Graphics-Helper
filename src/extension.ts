import * as vscode from 'vscode';
import { cropPdf } from './context_menu/crop_pdf';
import { convertDrawioToPdf } from './context_menu/convert_drawio_to_pdf';
import { LatexDropEditProvider } from './latex_code_generator/latex_drop_edit_provider';
import { pdfToImage } from './context_menu/convert_pdf_to_image';
import { getOutputPathCropPdf, getOutputPathConvertPdfToPng, getOutputPathConvertPdfToJpeg, getOutputPathConvertPdfToSvg, getPdftocairoPngOptions, getPdftocairoJpegOptions, getPdftocairoSvgOptions, getOutputPathConvertPngToPdf, getOutputPathConvertJpegToPdf, getOutputPathConvertSvgToPdf, getOutputPathConvertDrawioToPdf } from './configuration';
import { imageToPdf } from './context_menu/convert_image_to_pdf';
import { LatexPasteEditProvider } from './latex_code_generator/latex_paste_edit_provider';
import { deleteGeminiApiKey, storeGeminiApiKey } from './gemini/gemini_api_key';
import { runExplorerContextItem } from './context_menu/run_context_menu_item';

export function activate(context: vscode.ExtensionContext) {
	const secretStorage = context.secrets;

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.cropPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Cropping PDF files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				cropPdf(uri.fsPath, getOutputPathCropPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertDrawioToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting drawio files to PDF files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				await convertDrawioToPdf(uri.fsPath, getOutputPathConvertDrawioToPdf(), workspaceFolder);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToPng', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting PDF files to PNG files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				pdfToImage(uri.fsPath, getOutputPathConvertPdfToPng(), workspaceFolder, getPdftocairoPngOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToJpeg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting PDF files to JPEG files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				pdfToImage(uri.fsPath, getOutputPathConvertPdfToJpeg(), workspaceFolder, getPdftocairoJpegOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToSvg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting PDF files to SVG files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				pdfToImage(uri.fsPath, getOutputPathConvertPdfToSvg(), workspaceFolder, getPdftocairoSvgOptions());
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertPngToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting PNG files to PDF files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				imageToPdf(uri.fsPath, getOutputPathConvertPngToPdf(), workspaceFolder?.uri.fsPath);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertJpegToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting JPEG files to PDF files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				imageToPdf(uri.fsPath, getOutputPathConvertJpegToPdf(), workspaceFolder?.uri.fsPath);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.convertSvgToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, 'Converting SVG files to PDF files...', async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				imageToPdf(uri.fsPath, getOutputPathConvertSvgToPdf(), workspaceFolder?.uri.fsPath);
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
				title: 'Enter your Gemini API Key',
			});
			if (apiKey) {
				await storeGeminiApiKey(secretStorage, apiKey);
				vscode.window.showInformationMessage('Stored Gemini API Key');
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.deleteGeminiApiKey', async () => {
			await deleteGeminiApiKey(secretStorage);
			vscode.window.showInformationMessage('Deleted Gemini API Key');
		})
	);
}

export function deactivate() { }
