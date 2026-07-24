import type { MermaidTools } from '../../operations/conversion/tools/index.js';

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

export function readPuppeteerExecutablePath(configuration: MermaidConfiguration, legacyKey: string): string {
  return readSetting(configuration, 'puppeteer.executablePath', legacyKey, '').trim();
}

export function readMermaidPuppeteerOptions(
  configuration: MermaidConfiguration,
  legacySection: MermaidLegacySettingsSection,
): MermaidTools {
  const executablePath = readPuppeteerExecutablePath(
    configuration,
    `${legacySection}.mermaid.puppeteer.executablePath`,
  );

  return {
    browserChannel: readSetting(
      configuration,
      'mermaid.puppeteer.browserChannel',
      `${legacySection}.mermaid.puppeteer.browserChannel`,
      'chrome',
    ),
    theme: configuration.get<string>('mermaid.theme', 'default'),
    backgroundColor: configuration.get<string>('mermaid.backgroundColor', 'white'),
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
