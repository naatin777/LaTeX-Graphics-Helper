import * as vscode from 'vscode';

import { localeMap } from '../locale_map';
import { logger } from '../logger';

export function reportNoFilesSelected(command: string): void {
    logger.warn(`${command}: no files selected`);
    vscode.window.showErrorMessage(localeMap('noFilesSelected'));
}
