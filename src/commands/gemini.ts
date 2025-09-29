import * as vscode from 'vscode';

import { removeGeminiApiKey, storeGeminiApiKey } from '../gemini/gemini_api_key';
import { localeMap } from '../locale_map';

export async function setGeminiApiKey(
    secretStorage: vscode.SecretStorage
) {
    const apiKey = await vscode.window.showInputBox({
        password: true,
        title: localeMap('enterGeminiApiKey'),
    });
    if (apiKey) {
        await storeGeminiApiKey(secretStorage, apiKey);
        vscode.window.showInformationMessage(localeMap('storedGeminiApiKey'));
    }
}

export async function deleteGeminiApiKey(secretStorage: vscode.SecretStorage) {
    await removeGeminiApiKey(secretStorage);
    vscode.window.showInformationMessage(localeMap('deletedGeminiApiKey'));
}
