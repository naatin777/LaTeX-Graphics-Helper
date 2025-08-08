import * as vscode from 'vscode';
import { cropPdf } from './crop_pdf';
import { drawioToPdf } from './drawio_to_pdf';
import { PdfToLatexDropEditProvider } from './pdf_to_latex';
import { pdfToImage } from './pdf_to_image';
import { getOutputPathCropPdf, getOutputPathConvertPdfToPng, getOutputPathConvertPdfToJpeg, getOutputPathConvertPdfToSvg, getPdftocairoPngOptions, getPdftocairoJpegOptions, getPdftocairoSvgOptions, getOutputPathConvertPngToPdf, getOutputPathConvertJpegToPdf, getOutputPathConvertSvgToPdf } from './configuration';
import { imageToPdf } from './image_to_pdf';
import { ImageToLatexPasteEditProvider } from './image_to_latex';
import { deleteGeminiApiKey, storeGeminiApiKey } from './gemini_api_key';

export function activate(context: vscode.ExtensionContext) {
	const secretStorage = context.secrets;

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.cropPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Cropping PDF files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map((uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						cropPdf(uri.fsPath, getOutputPathCropPdf(), workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.drawioToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No drawio files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting drawio files to PDF files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						await drawioToPdf(uri.fsPath, undefined, workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentDropEditProvider(
			{ language: 'latex' },
			new PdfToLatexDropEditProvider(),
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.pdfToPng', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting PDF files to PNG files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						pdfToImage(uri.fsPath, getOutputPathConvertPdfToPng(), workspaceFolder?.uri.fsPath, getPdftocairoPngOptions(), 'PNG');
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.pdfToJpeg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting PDF files to JPEG files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						pdfToImage(uri.fsPath, getOutputPathConvertPdfToJpeg(), workspaceFolder?.uri.fsPath, getPdftocairoJpegOptions(), 'JPEG');
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.pdfToSvg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting PDF files to SVG files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						pdfToImage(uri.fsPath, getOutputPathConvertPdfToSvg(), workspaceFolder?.uri.fsPath, getPdftocairoSvgOptions(), 'SVG');
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.pngToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting PNG files to PDF files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						imageToPdf(uri.fsPath, getOutputPathConvertPngToPdf(), workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.jpegToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting JPEG files to PDF files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						imageToPdf(uri.fsPath, getOutputPathConvertJpegToPdf(), workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.svgToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			if (!uris) {
				vscode.window.showErrorMessage('No PDF files selected.');
				return;
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Converting SVG files to PDF files...',
				cancellable: false
			}, async (progress) => {
				await Promise.allSettled(
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						imageToPdf(uri.fsPath, getOutputPathConvertSvgToPdf(), workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'latex' },
			new ImageToLatexPasteEditProvider(secretStorage),
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
				title: 'pasteEnter your Gemini API Key',
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
