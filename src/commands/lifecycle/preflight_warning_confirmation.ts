import * as vscode from 'vscode';

import type { ConfirmWarningsHandler, PreflightReport } from '../../operations/input/input_preflight.js';
import { userMessage } from '../shared/user_messages.js';

export function createPreflightWarningConfirmation(operationLabel: string): ConfirmWarningsHandler {
  return async (warnings: PreflightReport[]) => {
    const items = warnings.map((w) => `${w.sourcePath}: ${w.reason ?? 'Warning'}`);
    const detail = items.join('\n');
    const proceed = userMessage('message.preflightWarning.proceed');
    const cancel = userMessage('message.preflightWarning.cancel');

    const selected = await vscode.window.showWarningMessage(
      userMessage('message.preflightWarning.title', operationLabel, warnings.length),
      { modal: true, detail },
      { title: proceed },
      { title: cancel, isCloseAffordance: true },
    );

    return selected?.title === proceed;
  };
}
