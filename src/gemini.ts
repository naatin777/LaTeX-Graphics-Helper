import * as vscode from 'vscode';
import { getGeminiApiKey } from './gemini_api_key';
import { getGeminiAIModel } from './configuration';

export async function askGemini(secretStorage: vscode.SecretStorage, message: string, buffer?: Buffer<ArrayBuffer>, bufferType?: string) {
    const { GoogleGenAI } = await import('@google/genai');

    const apiKey = await getGeminiApiKey(secretStorage);

    const blob = buffer && bufferType ? new Blob([buffer], { type: bufferType }) : undefined;

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const file = blob && bufferType ? await ai.files.upload({
        file: blob,
        config: {
            mimeType: bufferType
        }
    }) : undefined

    const contents = file ? [file, message] : [message];

    const res = await ai.models.generateContent({
        model: getGeminiAIModel(),
        contents: contents
    })

    return res.data
}
