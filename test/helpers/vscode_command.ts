import * as vscode from "vscode";

export async function runCommandAndClearNotifications<T>(
  commandExecution: Thenable<T>,
  waitBeforeClear: () => Promise<void>,
): Promise<T> {
  await waitBeforeClear();
  await vscode.commands.executeCommand("notifications.clearAll");
  return await commandExecution;
}

export async function clearNotificationsAfterDelay(delayMs = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await vscode.commands.executeCommand("notifications.clearAll");
}
