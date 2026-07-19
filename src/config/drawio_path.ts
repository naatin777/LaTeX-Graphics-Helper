type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export function readDrawioExecutablePath(configuration: ConfigurationReader): string {
  const configuredPath = configuration.get<string>('execPath.drawio', '').trim();
  return configuredPath || defaultDrawioPath();
}

export function defaultDrawioPath(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'drawio.exe' : 'drawio';
}
