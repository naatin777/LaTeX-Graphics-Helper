import type * as vscode from 'vscode';

import { readDrawioExecutablePath } from '../../config/external_tools/external_tool_paths.js';

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function selectedUris(uri?: vscode.Uri, uris?: vscode.Uri[]): vscode.Uri[] {
  const candidates = uris && uris.length > 0 ? uris : uri ? [uri] : [];
  return [...new Map(candidates.map((candidate) => [candidate.toString(), candidate])).values()];
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function readDrawioOptions(configuration: vscode.WorkspaceConfiguration): { drawioPath: string } {
  return { drawioPath: readDrawioExecutablePath(configuration) };
}
