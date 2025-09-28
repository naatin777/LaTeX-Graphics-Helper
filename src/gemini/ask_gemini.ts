import OpenAI from 'openai';
import * as vscode from 'vscode';

import { getGeminiModel } from '../configuration';

import { getGeminiApiKey } from './gemini_api_key';

export async function askGemini(secretStorage: vscode.SecretStorage, message: string, buffer: Buffer<ArrayBuffer>, mime: string) {
    const apiKey = await getGeminiApiKey(secretStorage);

    const ai = new OpenAI({ apiKey: apiKey, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' });
    const response = await ai.chat.completions.create({
        model: getGeminiModel(),
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: message },
                    { type: 'image_url', image_url: { url: `data:${mime};base64,${buffer.toString('base64')}` } }
                ]
            }
        ]
    });
    return response.choices[0].message.content;
}
