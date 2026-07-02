import { localeMap, type LocaleKeyType } from "../locale_map.js";

export function userMessage(key: LocaleKeyType, ...values: Array<number | string>): string {
  const template = localeMap(key);

  return template.replaceAll(/\{(\d+)\}/g, (_match, index: string) => {
    return String(values[Number(index)] ?? "");
  });
}
