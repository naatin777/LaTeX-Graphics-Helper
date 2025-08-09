import * as vscode from 'vscode';
import { getGeminiApiKey } from './gemini_api_key';
import { getGeminiModel } from '../configuration';

export async function askGemini(secretStorage: vscode.SecretStorage, message: string, buffer?: Buffer<ArrayBuffer>, fileMimeType?: string) {
    const { GoogleGenAI, createPartFromUri } = await import('@google/genai');

    const apiKey = await getGeminiApiKey(secretStorage);
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const blob = buffer && fileMimeType ? new Blob([buffer], { type: fileMimeType }) : undefined;
    const file = blob && fileMimeType ? await ai.files.upload({ file: blob, config: { mimeType: fileMimeType } }) : undefined;

    if (file) {
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
    }

    const contents = [];

    if (file && file.uri && file.mimeType) {
        const fileContent = createPartFromUri(file.uri, file.mimeType);
        contents.push(fileContent);
    }
    contents.push({ text: message });

    const res = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: contents
    });

    return res.text;
}
