import * as vscode from 'vscode';

import localeJa from '../package.nls.ja.json';
import localeEn from '../package.nls.json';

export type LocaleKeyType = keyof typeof localeEn;

interface LocaleEntry {
    [key: string]: string;
}

const localeTableKey = vscode.env.language;
const localeTable = Object.assign(localeEn, ((<{ [key: string]: LocaleEntry }>{
    ja: localeJa
})[localeTableKey] || {}));

const localeString = (key: string): string => localeTable[key] || key;
export const localeMap = (key: LocaleKeyType): string => localeString(key);
