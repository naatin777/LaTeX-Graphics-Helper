type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export function readOutputPathTemplate(configuration: ConfigurationReader, key: string, defaultValue: string): string {
  const template = configuration.get<unknown>(key, defaultValue);
  return typeof template === 'string' && template.trim() !== '' ? template : defaultValue;
}

export function readOutputPathsTemplate(configuration: ConfigurationReader, key: string, defaultValue: string): string {
  const outputPaths = configuration.get<unknown>('outputPaths', {});
  if (outputPaths === null || typeof outputPaths !== 'object' || Array.isArray(outputPaths)) {
    return defaultValue;
  }

  const template = (outputPaths as Record<string, unknown>)[key];
  return typeof template === 'string' && template.trim() !== '' ? template : defaultValue;
}
