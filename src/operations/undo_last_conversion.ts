import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { assertExistingPathInWorkspace } from "../security/workspace_path.js";

export interface ConversionOutput {
  outputPath: string;
  workspacePath: string;
}

export interface ConversionUndoRecord {
  id: string;
  outputs: ConversionUndoOutput[];
}

interface ConversionUndoOutput extends ConversionOutput {
  sha256: string;
}

export async function createConversionUndoRecord(
  outputs: ConversionOutput[],
): Promise<ConversionUndoRecord> {
  if (outputs.length === 0) {
    throw new Error("No conversion outputs were provided.");
  }

  const uniquePaths = new Set<string>();
  const recordedOutputs = await Promise.all(
    outputs.map(async (output) => {
      const normalizedPath = path.resolve(output.outputPath);

      if (uniquePaths.has(normalizedPath)) {
        throw new Error(`Duplicate conversion output: ${output.outputPath}`);
      }
      uniquePaths.add(normalizedPath);

      await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

      return {
        ...output,
        sha256: await calculateSha256(output.outputPath),
      };
    }),
  );

  return {
    id: crypto.randomUUID(),
    outputs: recordedOutputs,
  };
}

export async function undoConversionOutputs(record: ConversionUndoRecord): Promise<void> {
  await Promise.all(record.outputs.map(validateUnchangedOutput));

  for (const output of record.outputs) {
    // 検証後の差し替え時間を短くするため、削除直前にも同じ条件を確認する。
    await validateUnchangedOutput(output);
    await rm(output.outputPath);
  }
}

async function validateUnchangedOutput(output: ConversionUndoOutput): Promise<void> {
  await assertExistingPathInWorkspace(output.outputPath, output.workspacePath);

  if ((await calculateSha256(output.outputPath)) !== output.sha256) {
    throw new Error(`Output changed after conversion: ${output.outputPath}`);
  }
}

async function calculateSha256(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}
