import OpenAI from 'openai';
import * as vscode from 'vscode';

import { getAppConfig } from '../configuration';
import { FileInfo } from '../type';

import { getGeminiApiKey } from './gemini_api_key';

export async function askGemini(secretStorage: vscode.SecretStorage, message: string, info: FileInfo) {
    const apiKey = await getGeminiApiKey(secretStorage);

    const ai = new OpenAI({ apiKey: apiKey, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' });
    const response = await ai.chat.completions.create({
        model: getAppConfig().geminiModel,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: message },
                    { type: 'image_url', image_url: { url: `data:${info.type.mime};base64,${info.buffer.toString('base64')}` } }
                ]
            }
        ]
    });
    return response.choices[0].message.content;
}
