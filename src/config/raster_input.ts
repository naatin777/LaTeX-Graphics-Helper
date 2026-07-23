// Matches Sharp's default input pixel limit: 0x3fff × 0x3fff.
export const DEFAULT_MAX_INPUT_PIXELS = 268_402_689;

type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export function getMaxInputPixels(configuration: ConfigurationReader): number {
  const configuredValue = configuration.get<unknown>('raster.maxInputPixels', DEFAULT_MAX_INPUT_PIXELS);

  if (typeof configuredValue === 'number' && Number.isSafeInteger(configuredValue) && configuredValue >= 1) {
    return configuredValue;
  }

  return DEFAULT_MAX_INPUT_PIXELS;
}
