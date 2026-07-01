import type * as vscode from "vscode";

export async function withCancellationSignal<T>(
  token: vscode.CancellationToken,
  callback: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const abortController = new AbortController();
  const cancellationSubscription = token.onCancellationRequested(() => {
    abortController.abort();
  });

  try {
    if (token.isCancellationRequested) {
      abortController.abort();
    }

    return await callback(abortController.signal);
  } finally {
    cancellationSubscription.dispose();
  }
}
