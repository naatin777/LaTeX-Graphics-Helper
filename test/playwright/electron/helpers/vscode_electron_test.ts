import { access, rm, writeFile } from "node:fs/promises";

import { type ElectronApplication, type Page, type TestInfo } from "@playwright/test";

interface ElectronTestPaths {
  extensionsDir: string;
  sharedDataDir: string;
  temporaryRoot: string;
  userDataDir: string;
  workspacePath: string;
}

interface ElectronDiagnostics extends ElectronTestPaths {
  consoleMessages: string[];
  error: unknown;
  testInfo: TestInfo;
  window: Page | undefined;
}

export async function writeVscodeUserSettings(
  settingsPath: string,
  colorTheme: string,
): Promise<void> {
  await writeFile(
    settingsPath,
    JSON.stringify(
      {
        "window.menuStyle": "custom",
        "window.zoomLevel": 0,
        "workbench.colorTheme": colorTheme,
        "workbench.secondarySideBar.defaultVisibility": "hidden",
      },
      undefined,
      2,
    ),
  );
}

export async function attachElectronDiagnostics({
  consoleMessages,
  error,
  extensionsDir,
  sharedDataDir,
  temporaryRoot,
  testInfo,
  userDataDir,
  window,
  workspacePath,
}: ElectronDiagnostics): Promise<void> {
  const windowScreenshotPath = testInfo.outputPath("vscode-window.png");
  const hasWindowScreenshot = window
    ? await window
        .screenshot({ path: windowScreenshotPath })
        .then(() => true)
        .catch(() => false)
    : false;

  if (hasWindowScreenshot) {
    await testInfo.attach("vscode-window", {
      path: windowScreenshotPath,
      contentType: "image/png",
    });
  }

  const windowTitle = window ? await window.title().catch(() => "<unavailable>") : "<unavailable>";
  const windowText = window
    ? await window
        .locator("body")
        .innerText()
        .catch(() => "<unavailable>")
    : "<window unavailable>";
  const frameDiagnostics = window
    ? await Promise.all(
        window.frames().map(async (frame, index) => {
          const bodyText = await frame
            .locator("body")
            .innerText()
            .catch(() => "<unavailable>");

          return `frame[${index}] url: ${frame.url()}\n${bodyText.slice(0, 6000)}`;
        }),
      )
    : ["<window unavailable>"];
  const errorMessage =
    error instanceof Error
      ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
      : String(error);
  const diagnostics = [
    `error:\n${errorMessage}`,
    `temporaryRoot: ${temporaryRoot}`,
    `workspacePath: ${workspacePath}`,
    `userDataDir: ${userDataDir}`,
    `sharedDataDir: ${sharedDataDir}`,
    `extensionsDir: ${extensionsDir}`,
    `windowTitle: ${windowTitle}`,
    `windowUrl: ${window?.url() ?? "<unavailable>"}`,
    `windowText:\n${windowText.slice(0, 12000)}`,
    `frames:\n${frameDiagnostics.join("\n\n")}`,
    `electronConsole:\n${consoleMessages.join("\n") || "<empty>"}`,
  ].join("\n\n");
  const diagnosticsPath = testInfo.outputPath("vscode-electron-diagnostic.txt");

  await writeFile(diagnosticsPath, diagnostics);
  await testInfo.attach("vscode-electron-diagnostic", {
    path: diagnosticsPath,
    contentType: "text/plain",
  });
}

export async function disposeElectronTest(
  electronApp: ElectronApplication | undefined,
  temporaryRoot: string,
  afterClose?: () => Promise<void>,
): Promise<void> {
  await Promise.resolve()
    .then(async () => {
      if (electronApp) {
        const electronProcess = electronApp.process();
        await electronApp.close();
        if (electronProcess.exitCode === null && electronProcess.signalCode === null) {
          electronProcess.kill();
        }
      }
    })
    .then(async () => {
      await afterClose?.();
    })
    .finally(() =>
      rm(temporaryRoot, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      }),
    );

  if (await pathExists(temporaryRoot)) {
    throw new Error(`Electron test temporary directory was not removed: ${temporaryRoot}`);
  }
}

function pathExists(filePath: string): Promise<boolean> {
  return access(filePath).then(
    () => true,
    () => false,
  );
}
