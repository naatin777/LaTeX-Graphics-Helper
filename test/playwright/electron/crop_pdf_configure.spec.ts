import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Frame, type Locator, type Page } from "@playwright/test";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

import { cropConfigureFixture } from "../../helpers/crop_configure_fixture.js";

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
    await writeUserSettings(userSettingsPath, initialTheme);
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
    await expect(vscodeWindow.getByText("Safe Mode: ON", { exact: true })).toBeVisible();

    const explorer = vscodeWindow.getByRole("tree", { name: "Files Explorer" });
    await expect(explorer).toBeVisible();

    const pdfEntry = explorer.getByRole("treeitem", { name: cropConfigureFixture.fileName });
    await expect(pdfEntry).toBeVisible();
    await pdfEntry.click();
    await expect(pdfEntry).toHaveAttribute("aria-selected", "true");
    await pdfEntry.press("Shift+F10");

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
            const heading = frame.locator("h1").filter({ hasText: /^Custom Crop$/ });
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
    await expect(
      webviewFrame.getByText(`${cropConfigureFixture.fileName} · 2 pages`, { exact: true }),
    ).toBeVisible();

    const preview = webviewFrame.getByRole("region", { name: "PDF preview" });
    const settings = webviewFrame.getByRole("region", { name: "Crop settings" });
    const canvases = webviewFrame.locator("canvas[data-pdf-page]");

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

    const body = webviewFrame.locator("body");
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
    const darkScreenshot = await captureWebviewScreenshot(vscodeWindow, body);

    if (process.platform === "linux") {
      expect(darkScreenshot).toMatchSnapshot("crop-pdf-configure-dark.png", {
        maxDiffPixelRatio: 0.005,
      });
    }

    await writeUserSettings(userSettingsPath, alternateTheme);
    const lightTheme = await waitForWebviewTheme(body, "vscode-light");
    expect(lightTheme.bodyBackground).not.toBe(darkTheme.bodyBackground);
    expect(lightTheme.bodyForeground).not.toBe(darkTheme.bodyForeground);
    await expect
      .poll(
        async () => {
          const whitePixelRatios = await captureCanvasWhitePixelRatios(canvases);
          return whitePixelRatios.every((ratio) => ratio >= 0.2);
        },
        {
          message: "PDF canvas rendering became unreadable after switching the VS Code theme.",
        },
      )
      .toBe(true);
    const lightScreenshot = await captureWebviewScreenshot(vscodeWindow, body);

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
    const diagnosticsPath = testInfo.outputPath("vscode-electron-diagnostic.txt");

    await writeFile(diagnosticsPath, diagnostics);

    await testInfo.attach("vscode-electron-diagnostic", {
      path: diagnosticsPath,
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

async function writeUserSettings(settingsPath: string, colorTheme: string): Promise<void> {
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

interface WebviewThemeState {
  bodyBackground: string;
  bodyForeground: string;
}

async function captureCanvasWhitePixelRatios(canvases: Locator): Promise<number[]> {
  const canvasCount = await canvases.count();

  return Promise.all(
    Array.from({ length: canvasCount }, async (_, index) => {
      const screenshot = await canvases.nth(index).screenshot({
        animations: "disabled",
        caret: "hide",
      });
      const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
      let whitePixelCount = 0;

      for (let offset = 0; offset < data.length; offset += info.channels) {
        const red = data[offset] ?? 0;
        const green = data[offset + 1] ?? 0;
        const blue = data[offset + 2] ?? 0;

        if (red >= 240 && green >= 240 && blue >= 240) {
          whitePixelCount += 1;
        }
      }

      return whitePixelCount / (info.width * info.height);
    }),
  );
}

async function captureWebviewScreenshot(page: Page, body: Locator): Promise<Buffer> {
  const bodyBounds = await body.boundingBox();

  if (!bodyBounds) {
    throw new Error("Crop PDF Configure webview body has no visible bounds.");
  }

  return page.screenshot({
    animations: "disabled",
    caret: "hide",
    clip: bodyBounds,
  });
}

async function waitForWebviewTheme(
  body: Locator,
  themeClass: "vscode-dark" | "vscode-light",
): Promise<WebviewThemeState> {
  await expect(body).toHaveClass(new RegExp(`(^|\\s)${themeClass}(\\s|$)`));
  await expect
    .poll(() =>
      body.evaluate((element) => {
        const browser = globalThis as unknown as {
          document: {
            documentElement: typeof element;
            querySelector: (selector: string) => typeof element | null;
          };
          getComputedStyle: (target: typeof element) => {
            color: string;
            backgroundColor: string;
            getPropertyValue: (name: string) => string;
          };
        };
        const rootStyle = browser.getComputedStyle(browser.document.documentElement);
        const panel = browser.document.querySelector(".panel");
        const input = browser.document.querySelector(".input");
        const primaryButton = browser.document.querySelector(".button--primary");

        if (!panel || !input || !primaryButton) {
          return false;
        }

        const requiredVariables = [
          "--vscode-foreground",
          "--vscode-editor-background",
          "--vscode-descriptionForeground",
          "--vscode-sideBar-background",
          "--vscode-input-foreground",
          "--vscode-input-background",
          "--vscode-button-foreground",
          "--vscode-button-background",
          "--vscode-button-secondaryForeground",
          "--vscode-button-secondaryBackground",
        ];
        const computedStyles = [
          browser.getComputedStyle(element),
          browser.getComputedStyle(panel),
          browser.getComputedStyle(input),
          browser.getComputedStyle(primaryButton),
        ];

        return (
          requiredVariables.every(
            (variableName) => rootStyle.getPropertyValue(variableName).trim().length > 0,
          ) &&
          computedStyles.every(
            (style) =>
              style.color.length > 0 &&
              style.color !== "transparent" &&
              style.color !== "rgba(0, 0, 0, 0)" &&
              style.backgroundColor.length > 0 &&
              style.backgroundColor !== "transparent" &&
              style.backgroundColor !== "rgba(0, 0, 0, 0)",
          )
        );
      }),
    )
    .toBe(true);

  return body.evaluate((element) => {
    const browser = globalThis as unknown as {
      getComputedStyle: (target: typeof element) => {
        color: string;
        backgroundColor: string;
      };
    };
    const style = browser.getComputedStyle(element);
    return {
      bodyBackground: style.backgroundColor,
      bodyForeground: style.color,
    };
  });
}
