import * as vscode from 'vscode';

import { getGeminiModel } from '../configuration';

import { getGeminiApiKey } from './gemini_api_key';

export async function askGemini(secretStorage: vscode.SecretStorage, message: string, buffer: Buffer<ArrayBuffer>, mime: string) {
    const { GoogleGenAI, createPartFromUri } = await import('@google/genai');

    const apiKey = await getGeminiApiKey(secretStorage);
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const blob = new Blob([buffer], { type: mime });
    const file = await ai.files.upload({ file: blob, config: { mimeType: mime } });

    let getFile = await ai.files.get({ name: file.name as string });
    while (getFile.state === 'PROCESSING') {
        getFile = await ai.files.get({ name: file.name as string });
        await new Promise((resolve) => {
            setTimeout(resolve, 5000);
        });
    }
    if (file.state === 'FAILED') {
        throw new Error('File processing failed.');
    }

    const part = createPartFromUri(file.uri!, file.mimeType!);

    const res = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: [
            part,
            message
        ]
    });

    return res.text;
}
