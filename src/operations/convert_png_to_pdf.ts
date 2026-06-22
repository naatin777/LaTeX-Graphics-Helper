import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";

export interface ConvertPngToPdfOptions {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export async function convertPngToPdf(options: ConvertPngToPdfOptions): Promise<void> {
  const { sourcePath, outputPath, workspacePath } = options;

  await assertExistingPathInWorkspace(sourcePath, workspacePath);
  await assertWritablePathInWorkspace(outputPath, workspacePath);

  try {
    await access(outputPath);
    throw new Error(`Output file already exists: ${outputPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File does not exist, which is expected
    } else {
      throw error;
    }
  }

  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);

  const imageBuffer = await image.png().toBuffer();
  const imageEmbed = await pdfDoc.embedPng(imageBuffer);
  page.drawImage(imageEmbed, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();

  await mkdir(path.dirname(outputPath), { recursive: true });
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await writeFile(outputPath, pdfBytes);
}
