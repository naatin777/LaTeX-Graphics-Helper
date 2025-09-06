import * as vscode from 'vscode';

import { convertImageToPdf } from './commands/convert_image_to_pdf';
import { convertPdfToImage } from './commands/convert_pdf_to_image';
import { mergePdf } from './commands/merge_pdf';
import { getOutputPathConvertPdfToPng, getOutputPathConvertPdfToJpeg, getOutputPathConvertPdfToSvg, getOutputPathConvertPngToPdf, getOutputPathConvertJpegToPdf, getOutputPathConvertSvgToPdf } from './configuration';
import { PDFTOCAIRO_PNG_OPTIONS, PDFTOCAIRO_JPEG_OPTIONS, PDFTOCAIRO_SVG_OPTIONS } from './constants';
import { deleteGeminiApiKey, storeGeminiApiKey } from './gemini/gemini_api_key';
import { LatexDropEditProvider } from './latex_code_generator/latex_drop_edit_provider';
import { LatexPasteEditProvider } from './latex_code_generator/latex_paste_edit_provider';
import { localeMap } from './locale_map';
import { runExplorerContextItem } from './run_context_menu_item';

export function activate(context: vscode.ExtensionContext) {
	const secretStorage = context.secrets;

	context.subscriptions.push(
		vscode.commands.registerCommand('latex-graphics-helper.cropPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('cropPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.splitPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('splitPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.mergePdf', async (uri: vscode.Uri, uris: vscode.Uri[]) => {
			try {
				if (!uris) {
					throw new Error(localeMap('noFilesSelected'));
				}
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: localeMap('mergePdfProcess'),
					cancellable: false
				}, async (progress) => {
					const outputPath = await vscode.window.showSaveDialog({
						filters: {
							'PDF': ['pdf']
						},
					});
					const inputPaths = uris.map((uri) => uri.fsPath);
					if (outputPath) {
						await mergePdf(inputPaths, outputPath.fsPath);
					}
				});
			} catch (error) {
				if (error instanceof Error) {
					vscode.window.showErrorMessage(`${error.message}`);
				}
			}
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertDrawioToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertDrawioToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToPng', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToPngProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri, workspaceFolder, getOutputPathConvertPdfToPng(), PDFTOCAIRO_PNG_OPTIONS);
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToJpeg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToJpegProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri, workspaceFolder, getOutputPathConvertPdfToJpeg(), PDFTOCAIRO_JPEG_OPTIONS);
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertPdfToSvg', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPdfToSvgProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertPdfToImage(uri, workspaceFolder, getOutputPathConvertPdfToSvg(), PDFTOCAIRO_SVG_OPTIONS);
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertPngToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertPngToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri, workspaceFolder, getOutputPathConvertPngToPdf());
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertJpegToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertJpegToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri, workspaceFolder, getOutputPathConvertJpegToPdf());
			});
		}),
		vscode.commands.registerCommand('latex-graphics-helper.convertSvgToPdf', (uri: vscode.Uri, uris: vscode.Uri[]) => {
			runExplorerContextItem(uris, localeMap('convertSvgToPdfProcess'), async (uri: vscode.Uri, workspaceFolder: vscode.WorkspaceFolder) => {
				convertImageToPdf(uri, workspaceFolder, getOutputPathConvertSvgToPdf());
			});
		}),
		vscode.languages.registerDocumentDropEditProvider(
			{ language: 'latex' },
			new LatexDropEditProvider(),
		),
		vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'latex' },
			new LatexPasteEditProvider(secretStorage),
			{
				pasteMimeTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'],
				providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Empty],
			}
		),
		vscode.commands.registerCommand('latex-graphics-helper.setGeminiApiKey', async () => {
			const apiKey = await vscode.window.showInputBox({
				password: true,
				title: localeMap('enterGeminiApiKey'),
			});
			if (apiKey) {
				await storeGeminiApiKey(secretStorage, apiKey);
				vscode.window.showInformationMessage(localeMap('storedGeminiApiKey'));
			}
		}),
		vscode.commands.registerCommand('latex-graphics-helper.deleteGeminiApiKey', async () => {
			await deleteGeminiApiKey(secretStorage);
			vscode.window.showInformationMessage(localeMap('deletedGeminiApiKey'));
		})
	);
}

export function deactivate() { }
