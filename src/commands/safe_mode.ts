import * as vscode from "vscode";

import { SafeModeState } from "../application/safe_mode.js";
import type { OutputConflictDecision } from "../operations/commit_conversion_outputs.js";

export const TOGGLE_SAFE_MODE_COMMAND = "latex-graphics-helper.toggleSafeMode";

const KEEP_BOTH = "Keep Both";
const DO_NOT_OVERWRITE = "Do Not Overwrite";
const OVERWRITE = "Overwrite";

let safeModeState: SafeModeState | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function initializeSafeMode(context: vscode.ExtensionContext): void {
  safeModeState = new SafeModeState(context.globalState);
  statusBarItem = vscode.window.createStatusBarItem(
    "latex-graphics-helper.safeMode",
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = TOGGLE_SAFE_MODE_COMMAND;
  statusBarItem.tooltip = "Toggle output overwrite confirmation";
  updateStatusBar();
  statusBarItem.show();

  context.subscriptions.push(
    statusBarItem,
    vscode.commands.registerCommand(TOGGLE_SAFE_MODE_COMMAND, async () => {
      await requireSafeModeState().toggle();
      updateStatusBar();
    }),
  );
}

export async function resolveOutputConflicts(conflicts: string[]): Promise<OutputConflictDecision> {
  if (!requireSafeModeState().isEnabled()) {
    return "overwrite";
  }

  const selected = await vscode.window.showWarningMessage(
    `${conflicts.length} output file(s) already exist.`,
    { modal: true },
    KEEP_BOTH,
    DO_NOT_OVERWRITE,
    OVERWRITE,
  );

  if (selected === KEEP_BOTH) {
    return "keep-both";
  }

  if (selected === OVERWRITE) {
    return "overwrite";
  }

  return "cancel";
}

function requireSafeModeState(): SafeModeState {
  if (!safeModeState) {
    throw new Error("Safe Mode has not been initialized.");
  }

  return safeModeState;
}

function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }

  const enabled = requireSafeModeState().isEnabled();
  statusBarItem.text = `$(shield) Safe Mode: ${enabled ? "ON" : "OFF"}`;
}
