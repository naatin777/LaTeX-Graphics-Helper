import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';

import { Path } from '../type';

export async function createFolder(file: Path) {
    const uri = vscode.Uri.file(file);
    const folder = Utils.dirname(uri);
    await vscode.workspace.fs.createDirectory(folder);
}
