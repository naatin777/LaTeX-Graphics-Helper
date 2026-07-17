import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as vscode from 'vscode';

export async function withWorkspaceSettings(
  settings: Record<string, unknown>,
  callback: () => Promise<void>,
): Promise<void> {
  const settingsPath = getWorkspaceSettingsPath();
  const originalSettingsText = await readWorkspaceSettings(settingsPath);
  const originalSettings = parseWorkspaceSettings(originalSettingsText);
  const nextSettings = { ...originalSettings };

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) {
      delete nextSettings[key];
      continue;
    }

    nextSettings[key] = value;
  }

  const changedKeys = Object.keys(settings).filter((key) => {
    return originalSettings[key] !== nextSettings[key];
  });

  await mkdir(path.dirname(settingsPath), { recursive: true });
  const settingsChanged = onceWorkspaceConfigurationChanges(changedKeys);
  await writeWorkspaceSettings(settingsPath, nextSettings);

  try {
    await settingsChanged;
    await callback();
  } finally {
    const settingsRestored = onceWorkspaceConfigurationChanges(changedKeys);
    await restoreWorkspaceSettings(settingsPath, originalSettingsText);
    await settingsRestored;
  }
}

function getWorkspaceSettingsPath(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  return path.join(workspaceFolder.uri.fsPath, '.vscode', 'settings.json');
}

async function readWorkspaceSettings(settingsPath: string): Promise<string | undefined> {
  try {
    return await readFile(settingsPath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

function parseWorkspaceSettings(settingsText: string | undefined): Record<string, unknown> {
  if (settingsText === undefined) {
    return {};
  }

  return JSON.parse(settingsText) as Record<string, unknown>;
}

async function writeWorkspaceSettings(settingsPath: string, settings: Record<string, unknown>): Promise<void> {
  await writeFile(settingsPath, `${JSON.stringify(settings, undefined, 4)}\n`);
}

async function restoreWorkspaceSettings(settingsPath: string, originalSettingsText: string | undefined): Promise<void> {
  if (originalSettingsText === undefined) {
    await rm(settingsPath, { force: true });
    return;
  }

  await writeFile(settingsPath, originalSettingsText);
}

function onceWorkspaceConfigurationChanges(changedKeys: string[]): Promise<void> {
  if (changedKeys.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (changedKeys.some((key) => event.affectsConfiguration(key))) {
        disposable.dispose();
        resolve();
      }
    });
  });
}
