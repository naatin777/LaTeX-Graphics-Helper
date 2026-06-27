import * as vscode from "vscode";

export async function runCommandAndClearNotifications<T>(
  commandExecution: Thenable<T>,
  waitBeforeClear: () => Promise<void>,
): Promise<T> {
  await waitBeforeClear();
  return await runCommandAndClearNotificationsUntilDone(commandExecution);
}

export async function runCommandAndClearNotificationsUntilDone<T>(
  commandExecution: Thenable<T>,
): Promise<T> {
  const commandPromise = Promise.resolve(commandExecution);

  while ((await Promise.race([waitForCompletion(commandPromise), clearAndContinue()])) !== "done") {
    // Keep dismissing notifications until the command can complete.
  }

  return await commandPromise;
}

async function waitForCompletion(promise: Promise<unknown>): Promise<"done"> {
  try {
    await promise;
  } catch {
    // The caller awaits commandPromise and observes the original rejection.
  }

  return "done";
}

async function clearAndContinue(): Promise<"continue"> {
  await vscode.commands.executeCommand("notifications.clearAll");
  await sleep(50);
  return "continue";
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
