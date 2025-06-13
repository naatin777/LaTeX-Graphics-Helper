import * as vscode from 'vscode';
import { cropPdf } from './crop_pdf';
import { drawioToPdf } from './drawio_to_pdf';
import { PdfToLatexDropEditProvider } from './pdf_to_latex';
import { pdfToImage } from './pdf_to_image';
import { getJpegToPdfOutputPath, getPdfToJpegOptions, getPdfToJpegOutputPath, getPdfToPngOptions, getPdfToPngOutputPath, getPdfToSvgOptions, getPdfToSvgOutputPath, getPngToPdfOutputPath, getSvgToPdfOutputPath } from './configuration';
import { imageToPdf } from './image_to_pdf';
import { ImageToLatexPasteEditProvider } from './image_to_latex';

export function activate(context: vscode.ExtensionContext) {

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
						cropPdf(uri.fsPath, undefined, workspaceFolder?.uri.fsPath);
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
						pdfToImage(uri.fsPath, getPdfToPngOutputPath(), workspaceFolder?.uri.fsPath, getPdfToPngOptions(), 'PNG');
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
						pdfToImage(uri.fsPath, getPdfToJpegOutputPath(), workspaceFolder?.uri.fsPath, getPdfToJpegOptions(), 'JPEG');
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
						pdfToImage(uri.fsPath, getPdfToSvgOutputPath(), workspaceFolder?.uri.fsPath, getPdfToSvgOptions(), 'SVG');
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
						imageToPdf(uri.fsPath, getPngToPdfOutputPath(), workspaceFolder?.uri.fsPath);
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
						imageToPdf(uri.fsPath, getJpegToPdfOutputPath(), workspaceFolder?.uri.fsPath);
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
						imageToPdf(uri.fsPath, getSvgToPdfOutputPath(), workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);

	context.subscriptions.push(
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'latex' },
			new ImageToLatexPasteEditProvider(),
			{
				pasteMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml'],
				providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
			}
		)
	);
}

export function deactivate() { }
