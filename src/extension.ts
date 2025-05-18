import * as vscode from 'vscode';
import { cropPdf } from './crop_pdf';

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
					uris.map(async (uri: vscode.Uri) => {
						const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
						cropPdf(uri.fsPath, undefined, workspaceFolder?.uri.fsPath);
					})
				);
			});
		})
	);
}

export function deactivate() { }
