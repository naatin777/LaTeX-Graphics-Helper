import * as vscode from "vscode";

import localeJa from "../package.nls.ja.json" with { type: "json" };
import localeEn from "../package.nls.json" with { type: "json" };

export type LocaleKeyType = keyof typeof localeEn;

const localeTableKey = vscode.env.language;
const localeTable: Record<string, string> = {
  ...localeEn,
  ...(<{ [key: string]: Record<string, string> }>{ ja: localeJa })[localeTableKey],
};

const localeString = (key: string): string => localeTable[key] || key;
export const localeMap = (key: LocaleKeyType): string => localeString(key);
