import path from 'node:path';

export interface OutputPathContext {
  workspacePath: string;
  workspaceName: string;
  sourcePath: string;
  page?: string;
  dateNow?: number;
}

export type OutputPathPlatform = 'win32' | 'posix';

export interface ResolveOutputPathOptions {
  platform?: OutputPathPlatform;
}

export function resolveOutputPath(
  templatePath: string,
  context: OutputPathContext,
  options: ResolveOutputPathOptions = {},
): string {
  const platform = options.platform ?? currentOutputPathPlatform();
  const pathApi = platform === 'win32' ? path.win32 : path.posix;
  const values = createTemplateValues(context, pathApi);
  const expandedPath = templatePath.replace(/\${([^}]+)}/g, (_match, variable: string) => {
    const value = values[variable];

    if (value === undefined) {
      throw new Error(`Unsupported output path variable: \${${variable}}`);
    }

    return value;
  });
  const outputPath = pathApi.isAbsolute(expandedPath)
    ? pathApi.normalize(expandedPath)
    : pathApi.resolve(context.workspacePath, expandedPath);

  validateOutputPath(outputPath, platform, pathApi);
  return outputPath;
}

function createTemplateValues(context: OutputPathContext, pathApi: typeof path.posix): Record<string, string> {
  const { workspacePath, workspaceName, sourcePath } = context;
  const relativeFile = pathApi.relative(workspacePath, sourcePath);

  return {
    workspaceFolder: workspacePath,
    workspaceFolderBasename: workspaceName,
    file: sourcePath,
    relativeFile,
    relativeFileDirname: pathApi.dirname(relativeFile),
    fileBasename: pathApi.basename(sourcePath),
    fileBasenameNoExtension: pathApi.basename(sourcePath, pathApi.extname(sourcePath)),
    fileDirname: pathApi.dirname(sourcePath),
    fileExtname: pathApi.extname(sourcePath),
    page: context.page ?? '',
    dateNow: (context.dateNow ?? Date.now()).toString(),
  };
}

function currentOutputPathPlatform(): OutputPathPlatform {
  return process.platform === 'win32' ? 'win32' : 'posix';
}

function validateOutputPath(outputPath: string, platform: OutputPathPlatform, pathApi: typeof path.posix): void {
  const root = pathApi.parse(outputPath).root;
  const relativePath = outputPath.slice(root.length);
  const separatorPattern = platform === 'win32' ? /[\\/]+/ : /\/+/;
  const components = relativePath.split(separatorPattern).filter((component) => component !== '');

  for (const component of components) {
    if (component.includes('\u0000')) {
      throwInvalidComponent(platform, component, 'contains NUL');
    }

    if (platform === 'posix') {
      continue;
    }

    const controlCharacter = [...component].find((character) => {
      const characterCode = character.charCodeAt(0);
      return characterCode >= 1 && characterCode <= 31;
    });

    if (controlCharacter !== undefined) {
      throwInvalidComponent(platform, component, 'contains a control character');
    }

    const reservedCharacter = component.match(/[<>:"|?*]/)?.[0];

    if (reservedCharacter !== undefined) {
      throwInvalidComponent(platform, component, `contains reserved character ${JSON.stringify(reservedCharacter)}`);
    }

    if (component.startsWith(' ')) {
      throwInvalidComponent(platform, component, 'has a leading ASCII space');
    }

    if (component.endsWith(' ')) {
      throwInvalidComponent(platform, component, 'has a trailing ASCII space');
    }

    if (component.endsWith('.')) {
      throwInvalidComponent(platform, component, 'has a trailing period');
    }

    const baseName = component.split('.', 1)[0] ?? component;

    if (/^(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])$/i.test(baseName)) {
      throwInvalidComponent(platform, component, 'uses a reserved name');
    }
  }
}

function throwInvalidComponent(platform: OutputPathPlatform, component: string, reason: string): never {
  const platformName = platform === 'win32' ? 'Windows' : 'POSIX';
  throw new Error(`Invalid output path for ${platformName}: component ${JSON.stringify(component)} ${reason}.`);
}
