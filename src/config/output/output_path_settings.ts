type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export type OutputPathCommand =
  | 'convertToPdf'
  | 'convertToPng'
  | 'convertToJpeg'
  | 'convertToWebp'
  | 'convertToWebpPreserveAnimation'
  | 'convertToWebpSeparately'
  | 'convertToAvif'
  | 'convertToSvg'
  | 'convertToGif'
  | 'convertToGifPreserveAnimation'
  | 'convertToGifSeparately'
  | 'convertToTiff'
  | 'convertToEps'
  | 'convertToRaw'
  | 'convertToDrawio'
  | 'convertImagesToSinglePdf'
  | 'convertDrawioToPdf'
  | 'convertDrawioToPdfDirectly';

export function readOutputPathTemplate(
  configuration: ConfigurationReader,
  command: OutputPathCommand,
  legacyKey: string,
  defaultValue: string,
): string {
  const outputPaths = configuration.get<unknown>('outputPaths', {});
  const objectTemplate = readObjectTemplate(outputPaths, command);
  if (objectTemplate !== undefined) {
    return objectTemplate;
  }

  const formatTemplate = readOutputFormatOutputTemplate(configuration, `outputPath.${command}`);
  if (formatTemplate !== undefined) {
    return formatTemplate;
  }

  const legacyTemplate = configuration.get<unknown>(legacyKey, defaultValue);
  return typeof legacyTemplate === 'string' && legacyTemplate.trim() !== '' ? legacyTemplate : defaultValue;
}

export function readOutputFormatOutputTemplate(configuration: ConfigurationReader, key: string): string | undefined {
  const command = key.startsWith('outputPath.') ? key.slice('outputPath.'.length) : undefined;
  const objectTemplate =
    command === undefined
      ? undefined
      : readObjectTemplate(configuration.get<unknown>('outputPaths', {}), command as OutputPathCommand);
  const template = objectTemplate ?? configuration.get<unknown>(key, '');

  if (typeof template !== 'string' || template.trim() === '') {
    return undefined;
  }

  return template;
}

function readObjectTemplate(value: unknown, command: OutputPathCommand): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const entries = value as Record<string, unknown>;
  const template = entries[command] ?? entries[`latex-graphics-helper.${command}`];
  return typeof template === 'string' && template.trim() !== '' ? template : undefined;
}
