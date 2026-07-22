import * as vscode from 'vscode';

import { SafeModeState } from '../../application/policy/safe_mode.js';
import type { OutputConflictDecision } from '../../operations/lifecycle/commit_conversion_outputs.js';

import { userMessage } from '../shared/user_messages.js';

export const TOGGLE_SAFE_MODE_COMMAND = 'latex-graphics-helper.toggleSafeMode';

let safeModeState: SafeModeState | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function initializeSafeMode(context: vscode.ExtensionContext): void {
  safeModeState = new SafeModeState(context.globalState);
  statusBarItem = vscode.window.createStatusBarItem(
    'latex-graphics-helper.safeMode',
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = TOGGLE_SAFE_MODE_COMMAND;
  statusBarItem.tooltip = userMessage('message.safeMode.tooltip');
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
    return 'overwrite';
  }

  const keepBoth = userMessage('message.safeMode.keepBoth');
  const overwrite = userMessage('message.safeMode.overwrite');
  const selected = await vscode.window.showWarningMessage(
    userMessage('message.safeMode.conflicts', conflicts.length),
    { modal: true },
    { title: keepBoth },
    {
      title: userMessage('message.safeMode.doNotOverwrite'),
      isCloseAffordance: true,
    },
    { title: overwrite },
  );

  if (selected?.title === keepBoth) {
    return 'keep-both';
  }

  if (selected?.title === overwrite) {
    return 'overwrite';
  }

  return 'cancel';
}

function requireSafeModeState(): SafeModeState {
  if (!safeModeState) {
    throw new Error('Safe Mode has not been initialized.');
  }

  return safeModeState;
}

function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }

  const enabled = requireSafeModeState().isEnabled();
  statusBarItem.text = `$(shield) ${userMessage(enabled ? 'message.safeMode.statusOn' : 'message.safeMode.statusOff')}`;
}
