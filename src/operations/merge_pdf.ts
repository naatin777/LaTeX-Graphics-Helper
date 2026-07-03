import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";

export interface MergePdfOptions {
  sourcePaths: string[];
  outputPath: string;
  workspacePath: string;
}

export async function mergePdf(options: MergePdfOptions): Promise<void> {
  const { sourcePaths, outputPath, workspacePath } = options;

  if (sourcePaths.length < 2) {
    throw new Error("Select at least two PDF files.");
  }

  await Promise.all([
    ...sourcePaths.map((sourcePath) => assertExistingPathInWorkspace(sourcePath, workspacePath)),
    assertWritablePathInWorkspace(outputPath, workspacePath),
  ]);

  const mergedDocument = await PDFDocument.create();

  for (const sourcePath of sourcePaths) {
    const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
    const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

    for (const page of pages) {
      mergedDocument.addPage(page);
    }
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, await mergedDocument.save());
}
