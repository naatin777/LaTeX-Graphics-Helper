import * as vscode from 'vscode';

import { localeMap } from '../locale_map';

const GEMINI_API_KEY = 'latex-graphics-helper.gemini-api-key';

export async function storeGeminiApiKey(
    secretStorage: vscode.SecretStorage,
    value: string
) {
    await secretStorage.store(GEMINI_API_KEY, value);
}

export async function getGeminiApiKey(secretStorage: vscode.SecretStorage) {
    return await secretStorage.get(GEMINI_API_KEY);
}

export async function removeGeminiApiKey(secretStorage: vscode.SecretStorage) {
    await secretStorage.delete(GEMINI_API_KEY);
}

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
