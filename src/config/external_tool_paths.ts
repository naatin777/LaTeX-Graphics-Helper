type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export function readGhostscriptExecutablePath(configuration: ConfigurationReader): string {
  return readExecutablePath(configuration, 'execPath.ghostscript', defaultGhostscriptPath());
}

export function defaultGhostscriptPath(platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? 'gswin64c.exe' : 'gs';
}

export function readPdftocairoExecutablePath(configuration: ConfigurationReader): string {
  return readExecutablePath(configuration, 'execPath.pdftocairo', 'pdftocairo');
}

export function readRsvgConvertExecutablePath(configuration: ConfigurationReader): string {
  return readExecutablePath(configuration, 'execPath.rsvgConvert', 'rsvg-convert');
}

function readExecutablePath(configuration: ConfigurationReader, key: string, fallback: string): string {
  const configuredPath = configuration.get<string>(key, '').trim();
  return configuredPath || fallback;
}
