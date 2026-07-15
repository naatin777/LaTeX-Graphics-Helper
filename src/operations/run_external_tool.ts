import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { LineOutputChannel } from "./external_tool_ascii_scratch.js";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 10 * 1024 * 1024;

export interface ExternalToolResult {
  stdout: string;
  stderr: string;
}

export async function runExternalTool(options: {
  toolName: string;
  executable: string;
  args: string[];
  signal?: AbortSignal;
  outputChannel?: LineOutputChannel;
  redactArgument?: (argument: string, index: number) => string;
}): Promise<ExternalToolResult> {
  const loggedArgs = options.args.map(
    (argument, index) => options.redactArgument?.(argument, index) ?? argument,
  );
  options.outputChannel?.appendLine(`[${options.toolName}] executable: ${options.executable}`);
  options.outputChannel?.appendLine(`[${options.toolName}] arguments: ${loggedArgs.join(" ")}`);

  try {
    return await execFileAsync(options.executable, options.args, {
      encoding: "utf8",
      maxBuffer: MAX_BUFFER,
      signal: options.signal,
    });
  } catch (error) {
    const stderr =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr.trim()
        : "";
    options.outputChannel?.appendLine(
      `[${options.toolName}] failure: ${stderr || (error instanceof Error ? error.message : String(error))}`,
    );
    throw error;
  }
}
