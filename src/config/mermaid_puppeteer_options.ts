import type { MermaidPuppeteerOptions } from '../operations/convert_png_to_pdf.js';

export type MermaidLegacySettingsSection = 'convertToPdf' | 'convertToSvg';
type ConfigurationInspection<T> = {
  globalLanguageValue?: T;
  globalValue?: T;
  workspaceLanguageValue?: T;
  workspaceValue?: T;
  workspaceFolderLanguageValue?: T;
  workspaceFolderValue?: T;
};

export type MermaidConfiguration = {
  get<T>(key: string, defaultValue: T): T;
  inspect<T>(key: string): ConfigurationInspection<T> | undefined;
};

export function readMermaidPuppeteerOptions(
  configuration: MermaidConfiguration,
  legacySection: MermaidLegacySettingsSection,
): MermaidPuppeteerOptions {
  const executablePath = readSetting(
    configuration,
    'mermaid.puppeteer.executablePath',
    `${legacySection}.mermaid.puppeteer.executablePath`,
    '',
  ).trim();

  return {
    browserChannel: readSetting(
      configuration,
      'mermaid.puppeteer.browserChannel',
      `${legacySection}.mermaid.puppeteer.browserChannel`,
      'chrome',
    ),
    ...(executablePath ? { executablePath } : {}),
  };
}

function readSetting<T>(configuration: MermaidConfiguration, key: string, legacyKey: string, defaultValue: T): T {
  const inspected = configuration.inspect<T>(key);
  const hasConfiguredValue = [
    inspected?.globalLanguageValue,
    inspected?.globalValue,
    inspected?.workspaceLanguageValue,
    inspected?.workspaceValue,
    inspected?.workspaceFolderLanguageValue,
    inspected?.workspaceFolderValue,
  ].some((value) => value !== undefined);

  return configuration.get<T>(hasConfiguredValue ? key : legacyKey, defaultValue);
}
