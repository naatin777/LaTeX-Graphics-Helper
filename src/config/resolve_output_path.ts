import path from "node:path";

export interface OutputPathContext {
  workspacePath: string;
  workspaceName: string;
  sourcePath: string;
  page?: string;
  dateNow?: number;
}

export function resolveOutputPath(templatePath: string, context: OutputPathContext): string {
  const values = createTemplateValues(context);
  const expandedPath = templatePath.replace(/\${([^}]+)}/g, (_match, variable: string) => {
    const value = values[variable];

    if (value === undefined) {
      throw new Error(`Unsupported output path variable: \${${variable}}`);
    }

    return value;
  });

  return path.isAbsolute(expandedPath)
    ? path.normalize(expandedPath)
    : path.resolve(context.workspacePath, expandedPath);
}

function createTemplateValues(context: OutputPathContext): Record<string, string> {
  const { workspacePath, workspaceName, sourcePath } = context;
  const relativeFile = path.relative(workspacePath, sourcePath);

  return {
    workspaceFolder: workspacePath,
    workspaceFolderBasename: workspaceName,
    file: sourcePath,
    relativeFile,
    relativeFileDirname: path.dirname(relativeFile),
    fileBasename: path.basename(sourcePath),
    fileBasenameNoExtension: path.basename(sourcePath, path.extname(sourcePath)),
    fileDirname: path.dirname(sourcePath),
    fileExtname: path.extname(sourcePath),
    page: context.page ?? "",
    dateNow: (context.dateNow ?? Date.now()).toString(),
  };
}
