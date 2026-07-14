import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import { PDFDocument } from "pdf-lib";

import { cropConfigureFixture } from "../../helpers/crop_configure_fixture.js";
import { captureCropPdfScreenshot } from "./helpers/crop_pdf_screenshot.js";
import {
  expectPdfCanvasesReadable,
  openCropPdfConfigure,
  waitForWebviewTheme,
} from "./helpers/crop_pdf_webview.js";
import {
  attachElectronDiagnostics,
  disposeElectronTest,
  writeVscodeUserSettings,
} from "./helpers/vscode_electron_test.js";

const projectRoot = process.cwd();
const vscodeVersion = "1.128.0";
const temporaryBase = process.platform === "win32" ? tmpdir() : "/tmp";
const sourceFixture = join(
  projectRoot,
  "test",
  "fixtures",
  "pdf-operations",
  "user-files",
  cropConfigureFixture.fileName,
);
const initialTheme = "Default Dark Modern";
const alternateTheme = "Default Light Modern";
const expectedCropBox = {
  x: cropConfigureFixture.cropBox.left,
  y: cropConfigureFixture.cropBox.bottom,
  width: cropConfigureFixture.cropBox.right - cropConfigureFixture.cropBox.left,
  height: cropConfigureFixture.cropBox.top - cropConfigureFixture.cropBox.bottom,
};

test("実VS CodeでCrop PDF Configureを操作して全ページをcropする", async ({
  playwright,
}, testInfo) => {
  // Playwright exposes its Electron launcher under the experimental `_electron` API.
  // oxlint-disable-next-line eslint/no-underscore-dangle
  const electron = playwright._electron;
  const temporaryRoot = await mkdtemp(join(temporaryBase, "lgh-electron-"));
  const workspacePath = join(temporaryRoot, "workspace");
  const userDataDir = join(temporaryRoot, "user-data");
  const userSettingsDir = join(userDataDir, "User");
  const userSettingsPath = join(userSettingsDir, "settings.json");
  const sharedDataDir = join(temporaryRoot, "shared-data");
  const extensionsDir = join(temporaryRoot, "extensions");
  const inputPath = join(workspacePath, cropConfigureFixture.fileName);
  const outputPath = join(workspacePath, "q a-crop.pdf");
  let electronApp: Awaited<ReturnType<typeof electron.launch>> | undefined;
  let window: Page | undefined;
  const consoleMessages: string[] = [];
  const sourceFixtureBytes = await readFile(sourceFixture);

  try {
    await Promise.all([
      mkdir(workspacePath),
      mkdir(userSettingsDir, { recursive: true }),
      mkdir(sharedDataDir),
      mkdir(extensionsDir),
    ]);
    await writeVscodeUserSettings(userSettingsPath, initialTheme);
    await cp(sourceFixture, inputPath);

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
    await vscodeWindow.setViewportSize({ width: 1280, height: 900 });
    const {
      body,
      canvases,
      frame: webviewFrame,
      preview,
      settings,
    } = await openCropPdfConfigure(vscodeWindow, cropConfigureFixture.fileName);

    await expect(
      webviewFrame.getByRole("heading", { name: "Custom Crop", exact: true }),
    ).toBeVisible();
    await expect(
      webviewFrame.getByText(`${cropConfigureFixture.fileName} · 2 pages`, { exact: true }),
    ).toBeVisible();

    await expect(preview).toBeVisible();
    await expect(settings).toBeVisible();
    await expect(canvases).toHaveCount(2);
    await expect
      .poll(() =>
        canvases.evaluateAll((elements) =>
          elements.every((canvas) => {
            const bounds = canvas.getBoundingClientRect();
            return canvas.width > 0 && canvas.height > 0 && bounds.width > 0 && bounds.height > 0;
          }),
        ),
      )
      .toBe(true);
    await expect(webviewFrame.locator(".pdf-page__footer")).toHaveText([
      "Page 1 / 2",
      "Page 2 / 2",
    ]);
    await expect(webviewFrame.getByText(/PDFを表示できませんでした:/)).toHaveCount(0);

    const darkTheme = await waitForWebviewTheme(body, "vscode-dark");

    await settings
      .getByRole("spinbutton", { name: "Left", exact: true })
      .fill(cropConfigureFixture.cropBox.left.toString());
    await settings
      .getByRole("spinbutton", { name: "Bottom", exact: true })
      .fill(cropConfigureFixture.cropBox.bottom.toString());
    await settings
      .getByRole("spinbutton", { name: "Right", exact: true })
      .fill(cropConfigureFixture.cropBox.right.toString());
    await settings
      .getByRole("spinbutton", { name: "Top", exact: true })
      .fill(cropConfigureFixture.cropBox.top.toString());
    await expect(settings.getByRole("radio", { name: "All pages", exact: true })).toBeChecked();
    await expectPdfCanvasesReadable(canvases);
    const darkScreenshot = await captureCropPdfScreenshot(vscodeWindow, body);
    await testInfo.attach("crop-pdf-configure-dark", {
      body: darkScreenshot,
      contentType: "image/png",
    });

    if (process.platform === "linux") {
      expect(darkScreenshot).toMatchSnapshot("crop-pdf-configure-dark.png", {
        maxDiffPixelRatio: 0.005,
      });
    }

    await writeVscodeUserSettings(userSettingsPath, alternateTheme);
    const lightTheme = await waitForWebviewTheme(body, "vscode-light");
    expect(lightTheme.bodyBackground).not.toBe(darkTheme.bodyBackground);
    expect(lightTheme.bodyForeground).not.toBe(darkTheme.bodyForeground);
    await expectPdfCanvasesReadable(
      canvases,
      "PDF canvas rendering became unreadable after switching the VS Code theme.",
    );
    const lightScreenshot = await captureCropPdfScreenshot(vscodeWindow, body, {
      canvases,
      snapshotPrefix: join(temporaryRoot, "crop-pdf-light"),
    });
    await testInfo.attach("crop-pdf-configure-light", {
      body: lightScreenshot,
      contentType: "image/png",
    });

    if (process.platform === "linux") {
      expect(lightScreenshot).toMatchSnapshot("crop-pdf-configure-light.png", {
        maxDiffPixelRatio: 0.005,
      });
    }

    await settings.getByRole("button", { name: "Apply", exact: true }).click();

    await expect
      .poll(async () => {
        try {
          const outputDocument = await PDFDocument.load(await readFile(outputPath));
          return outputDocument.getPageCount();
        } catch {
          return 0;
        }
      })
      .toBe(2);

    const outputDocument = await PDFDocument.load(await readFile(outputPath));
    expect(outputDocument.getPageCount()).toBe(2);

    for (const page of outputDocument.getPages()) {
      expect(page.getMediaBox()).toEqual(expectedCropBox);
      expect(page.getCropBox()).toEqual(expectedCropBox);
    }

    expect(await readFile(sourceFixture)).toEqual(sourceFixtureBytes);
    expect(await readFile(inputPath)).toEqual(sourceFixtureBytes);

    const successNotification = vscodeWindow.getByText("Cropped 1 PDF file(s).", {
      exact: true,
    });
    await expect(successNotification).toBeVisible();
    await vscodeWindow.keyboard.press("Escape");
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir,
      sharedDataDir,
      temporaryRoot,
      testInfo,
      userDataDir,
      window,
      workspacePath,
    });
    throw error;
  } finally {
    await disposeElectronTest(electronApp, temporaryRoot);
  }
});
