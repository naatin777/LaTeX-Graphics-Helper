import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("latex-graphics-helper.cropPdf", async () => {
      await vscode.window.showInformationMessage("LaTeX Graphics Helper");
    }),
  );
}

export function deactivate() {}
