import path from 'node:path';

export type SourceFormat =
  | 'pdf'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'tiff'
  | 'eps'
  | 'svg'
  | 'mermaid'
  | 'drawio'
  | 'editable-drawio-png'
  | 'editable-drawio-svg';

export function sourceFormatForPath(sourcePath: string): SourceFormat | undefined {
  const lowerSourcePath = sourcePath.toLowerCase();
  if (lowerSourcePath.endsWith('.drawio.png') || lowerSourcePath.endsWith('.dio.png')) {
    return 'editable-drawio-png';
  }
  if (lowerSourcePath.endsWith('.drawio.svg') || lowerSourcePath.endsWith('.dio.svg')) {
    return 'editable-drawio-svg';
  }
  if (lowerSourcePath.endsWith('.drawio') || lowerSourcePath.endsWith('.dio')) {
    return 'drawio';
  }

  switch (path.extname(lowerSourcePath)) {
    case '.pdf':
      return 'pdf';
    case '.png':
      return 'png';
    case '.jpg':
    case '.jpeg':
      return 'jpeg';
    case '.webp':
      return 'webp';
    case '.avif':
      return 'avif';
    case '.gif':
      return 'gif';
    case '.tif':
    case '.tiff':
      return 'tiff';
    case '.eps':
      return 'eps';
    case '.svg':
      return 'svg';
    case '.mmd':
    case '.mermaid':
      return 'mermaid';
    default:
      return undefined;
  }
}

export function isRasterImagePath(sourcePath: string): boolean {
  const format = sourceFormatForPath(sourcePath);
  return (
    format === 'png' ||
    format === 'jpeg' ||
    format === 'webp' ||
    format === 'avif' ||
    format === 'gif' ||
    format === 'tiff'
  );
}

export function isEpsPath(sourcePath: string): boolean {
  return sourceFormatForPath(sourcePath) === 'eps';
}

export function isSupportedImageInputPath(sourcePath: string): boolean {
  return isRasterImagePath(sourcePath) || isEpsPath(sourcePath);
}

export function isMermaidPath(sourcePath: string): boolean {
  return sourceFormatForPath(sourcePath) === 'mermaid';
}

export function isEditableDrawioImagePath(sourcePath: string): boolean {
  const format = sourceFormatForPath(sourcePath);
  return format === 'editable-drawio-png' || format === 'editable-drawio-svg';
}

export function isNativeDrawioPath(sourcePath: string): boolean {
  return sourceFormatForPath(sourcePath) === 'drawio';
}

export function isDrawioPath(sourcePath: string): boolean {
  return isNativeDrawioPath(sourcePath) || isEditableDrawioImagePath(sourcePath);
}

export function logicalSourcePathForOutputTemplate(sourcePath: string): string {
  if (!isEditableDrawioImagePath(sourcePath)) {
    return sourcePath;
  }

  return sourcePath.replace(/\.(drawio|dio)\.(png|svg)$/i, '');
}
