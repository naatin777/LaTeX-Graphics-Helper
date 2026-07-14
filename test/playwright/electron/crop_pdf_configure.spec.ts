import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Frame, type Page } from "@playwright/test";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";

const projectRoot = process.cwd();
const vscodeVersion = "1.128.0";
const temporaryBase = process.platform === "win32" ? tmpdir() : "/tmp";
const sourceFixture = join(
  projectRoot,
  "test",
  "fixtures",
  "pdf-operations",
  "user-files",
  "q a.pdf",
);

test("実VS CodeでExplorerからCrop PDF ConfigureのWebviewへ到達する", async ({
  playwright,
}, testInfo) => {
  // Playwright exposes its Electron launcher under the experimental `_electron` API.
  // oxlint-disable-next-line eslint/no-underscore-dangle
  const electron = playwright._electron;
  const temporaryRoot = await mkdtemp(join(temporaryBase, "lgh-electron-"));
  const workspacePath = join(temporaryRoot, "workspace");
  const userDataDir = join(temporaryRoot, "user-data");
  const userSettingsDir = join(userDataDir, "User");
  const sharedDataDir = join(temporaryRoot, "shared-data");
  const extensionsDir = join(temporaryRoot, "extensions");
  let electronApp: Awaited<ReturnType<typeof electron.launch>> | undefined;
  let window: Page | undefined;
  const consoleMessages: string[] = [];

  try {
    await Promise.all([
      mkdir(workspacePath),
      mkdir(userSettingsDir, { recursive: true }),
      mkdir(sharedDataDir),
      mkdir(extensionsDir),
    ]);
    await writeFile(
      join(userSettingsDir, "settings.json"),
      JSON.stringify({ "window.menuStyle": "custom" }),
    );
    await cp(sourceFixture, join(workspacePath, "q a.pdf"));

    const vscodeExecutablePath = await downloadAndUnzipVSCode({ version: vscodeVersion });

    electronApp = await electron.launch({
      executablePath: vscodeExecutablePath,
      cwd: projectRoot,
      args: [
        workspacePath,
        `--extensionDevelopmentPath=${projectRoot}`,
        `--user-data-dir=${userDataDir}`,
        `--shared-data-dir=${sharedDataDir}`,
        `--extensions-dir=${extensionsDir}`,
        "--disable-updates",
        "--skip-welcome",
        "--skip-release-notes",
        "--disable-workspace-trust",
        "--no-sandbox",
        "--disable-gpu-sandbox",
        "--no-cached-data",
        "--locale=en",
      ],
    });
    electronApp.on("console", (message) => {
      consoleMessages.push(message.text());
    });

    const vscodeWindow = await electronApp.firstWindow();
    window = vscodeWindow;
    const explorer = vscodeWindow.getByRole("tree", { name: "Files Explorer" });
    await expect(explorer).toBeVisible();

    const pdfEntry = explorer.getByRole("treeitem", { name: "q a.pdf" });
    await expect(pdfEntry).toBeVisible();
    await pdfEntry.click({ button: "right" });

    const cropPdfMenu = vscodeWindow.getByRole("menuitem", { name: "Crop PDF" });
    await expect(cropPdfMenu).toBeVisible();
    await cropPdfMenu.click();

    const configureMenu = vscodeWindow.getByRole("menuitem", { name: "Configure crop" });
    await expect(configureMenu).toBeVisible();
    await configureMenu.hover();
    await expect(configureMenu).toBeFocused();
    await vscodeWindow.keyboard.press("Enter");

    let webviewFrame: Frame | undefined;
    await expect
      .poll(
        async () => {
          for (const frame of vscodeWindow.frames()) {
            const heading = frame.getByRole("heading", { name: "Custom Crop", exact: true });
            if ((await heading.count()) > 0) {
              webviewFrame = frame;
              return true;
            }
          }

          return false;
        },
        {
          message: "Crop PDF Configure webview was not created.",
        },
      )
      .toBe(true);

    if (!webviewFrame) {
      throw new Error("Crop PDF Configure webview was not found after it was created.");
    }

    await expect(
      webviewFrame.getByRole("heading", { name: "Custom Crop", exact: true }),
    ).toBeVisible();
  } catch (error) {
    const windowTitle = window
      ? await window.title().catch(() => "<unavailable>")
      : "<unavailable>";
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

    await testInfo.attach("vscode-electron-diagnostic", {
      body: Buffer.from(diagnostics),
      contentType: "text/plain",
    });
    throw error;
  } finally {
    try {
      if (electronApp) {
        const electronProcess = electronApp.process();
        await electronApp.close();
        if (electronProcess.exitCode === null && electronProcess.signalCode === null) {
          electronProcess.kill();
        }
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
});
