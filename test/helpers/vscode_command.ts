import * as vscode from 'vscode';

const NOTIFICATION_CLEAR_INTERVAL_MS = 500;

export async function runCommandAndClearNotifications<T>(
  commandExecution: Thenable<T>,
  waitBeforeClear: () => Promise<void>,
): Promise<T> {
  await waitBeforeClear();
  return runCommandAndClearNotificationsUntilDone(commandExecution);
}

export async function runCommandAndClearNotificationsUntilDone<T>(commandExecution: Thenable<T>): Promise<T> {
  const commandPromise = Promise.resolve(commandExecution);
  const completion = waitForCompletion(commandPromise);

  while ((await Promise.race([completion, clearAfterDelay()])) !== 'done') {
    // Keep dismissing notifications until the command can complete.
  }

  return commandPromise;
}

async function waitForCompletion(promise: Promise<unknown>): Promise<'done'> {
  try {
    await promise;
  } catch {
    // The caller awaits commandPromise and observes the original rejection.
  }

  return 'done';
}

async function clearAfterDelay(): Promise<'continue'> {
  await sleep(NOTIFICATION_CLEAR_INTERVAL_MS);
  await vscode.commands.executeCommand('notifications.clearAll');
  return 'continue';
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
