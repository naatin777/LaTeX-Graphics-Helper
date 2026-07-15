import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
} from "./commit_conversion_outputs.js";

export interface MergePdfOptions {
  sourcePaths: string[];
  outputPath: string;
  workspacePath: string;
  runId?: string;
  signal?: AbortSignal;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
}

export async function mergePdf(options: MergePdfOptions): Promise<CommittedConversionOutput[]> {
  const { sourcePaths, outputPath, workspacePath } = options;

  if (sourcePaths.length < 2) {
    throw new Error("Select at least two PDF files.");
  }

  options.signal?.throwIfAborted();
  await Promise.all([
    ...sourcePaths.map((sourcePath) => assertExistingPathInWorkspace(sourcePath, workspacePath)),
    assertWritablePathInWorkspace(outputPath, workspacePath),
    assertWritablePathInWorkspace(
      path.join(workspacePath, ".latex-graphics-helper", "merge-pdf"),
      workspacePath,
    ),
  ]);
  options.signal?.throwIfAborted();

  const mergedDocument = await PDFDocument.create();

  for (const sourcePath of sourcePaths) {
    options.signal?.throwIfAborted();
    const sourceDocument = await PDFDocument.load(await readFile(sourcePath));
    options.signal?.throwIfAborted();
    const pages = await mergedDocument.copyPages(sourceDocument, sourceDocument.getPageIndices());

    for (const page of pages) {
      options.signal?.throwIfAborted();
      mergedDocument.addPage(page);
    }
  }

  options.signal?.throwIfAborted();
  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const stagedOutputPath = path.join(
    workspacePath,
    ".latex-graphics-helper",
    "merge-pdf",
    runId,
    "result.pdf",
  );

  await assertWritablePathInWorkspace(stagedOutputPath, workspacePath);
  await mkdir(path.dirname(stagedOutputPath), { recursive: true });
  options.signal?.throwIfAborted();
  await writeFile(stagedOutputPath, await mergedDocument.save());
  options.signal?.throwIfAborted();

  return commitConversionOutputs([{ stagedOutputPath, outputPath, workspacePath }], {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
  });
}
