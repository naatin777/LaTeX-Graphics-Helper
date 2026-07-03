type ConfigurationReader = {
  get<T>(key: string, defaultValue: T): T;
};

export function readOutputFormatOutputTemplate(
  configuration: ConfigurationReader,
  key: string,
): string | undefined {
  const template = configuration.get<unknown>(key, "");

  if (typeof template !== "string" || template.trim() === "") {
    return undefined;
  }

  return template;
}
