import * as vscode from 'vscode';

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
