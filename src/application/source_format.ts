import path from "node:path";

export type SourceFormat =
  | "pdf"
  | "png"
  | "jpeg"
  | "webp"
  | "avif"
  | "svg"
  | "mermaid"
  | "editable-drawio-png"
  | "editable-drawio-svg";

export function sourceFormatForPath(sourcePath: string): SourceFormat | undefined {
  const lowerSourcePath = sourcePath.toLowerCase();
  if (lowerSourcePath.endsWith(".drawio.png") || lowerSourcePath.endsWith(".dio.png")) {
    return "editable-drawio-png";
  }
  if (lowerSourcePath.endsWith(".drawio.svg") || lowerSourcePath.endsWith(".dio.svg")) {
    return "editable-drawio-svg";
  }

  switch (path.extname(lowerSourcePath)) {
    case ".pdf":
      return "pdf";
    case ".png":
      return "png";
    case ".jpg":
    case ".jpeg":
      return "jpeg";
    case ".webp":
      return "webp";
    case ".avif":
      return "avif";
    case ".svg":
      return "svg";
    case ".mmd":
    case ".mermaid":
      return "mermaid";
    default:
      return undefined;
  }
}

export function isMermaidPath(sourcePath: string): boolean {
  return sourceFormatForPath(sourcePath) === "mermaid";
}

export function isEditableDrawioImagePath(sourcePath: string): boolean {
  const format = sourceFormatForPath(sourcePath);
  return format === "editable-drawio-png" || format === "editable-drawio-svg";
}

export function logicalSourcePathForOutputTemplate(sourcePath: string): string {
  if (!isEditableDrawioImagePath(sourcePath)) {
    return sourcePath;
  }

  return sourcePath.replace(/\.(drawio|dio)\.(png|svg)$/i, "");
}
