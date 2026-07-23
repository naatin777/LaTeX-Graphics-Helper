import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

import { cropConfigureFixture } from '../../helpers/crop_configure_fixture.js';
import type { MergePdfOptions } from '../../../src/operations/pdf/merge_pdf.js';
import type { SplitPdfOptions, SplitPdfOutput } from '../../../src/operations/pdf/split_pdf.js';

import { captureCropPdfScreenshot } from './helpers/crop_pdf_screenshot.js';
import {
  expectPdfCanvasesReadable,
  expectWebviewNetworkBlocked,
  convertPdfToJpeg,
  convertPngToJpeg,
  openCropPdfConfigure,
  waitForWebviewTheme,
} from './helpers/crop_pdf_webview.js';
import {
  attachElectronDiagnostics,
  disposeElectronTest,
  writeVscodeUserSettings,
} from './helpers/vscode_electron_test.js';
import {
  loadPackagedOperation,
  resolvePackagedVsixPath,
  setupElectronTest,
  type ElectronTestEnv,
} from './helpers/electron_test_env.js';

const packagedVsixPath = resolvePackagedVsixPath(process.env.LGH_VSIX_PATH);
const alternateTheme = 'Default Light Modern';
const expectedCropBox = {
  x: cropConfigureFixture.cropBox.left,
  y: cropConfigureFixture.cropBox.bottom,
  width: cropConfigureFixture.cropBox.right - cropConfigureFixture.cropBox.left,
  height: cropConfigureFixture.cropBox.top - cropConfigureFixture.cropBox.bottom,
};

type PackagedMergePdfModule = {
  mergePdf(options: MergePdfOptions): Promise<unknown>;
};
type PackagedSplitPdfModule = {
  splitPdfAllPages(options: SplitPdfOptions): Promise<SplitPdfOutput[]>;
};

test('VSIXをinstallしてextensionをactivateできる', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);

    await expect(env.window.getByText('Safe Mode: ON', { exact: true })).toBeVisible();
    await expect(env.window.getByRole('tree', { name: 'Files Explorer' })).toBeVisible();
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages: [],
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('Crop Configure Webviewを開きPDFを表示しApplyして正しいPDFを出力できる', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const {
      canvases,
      frame: webviewFrame,
      preview,
      settings,
    } = await openCropPdfConfigure(env.window, cropConfigureFixture.fileName);

    await expect(webviewFrame.getByRole('heading', { name: 'Custom Crop', exact: true })).toBeVisible();
    await expect(webviewFrame.getByText(`${cropConfigureFixture.fileName} · 2 pages`, { exact: true })).toBeVisible();

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
    await expect(webviewFrame.locator('.pdf-page__footer')).toHaveText(['Page 1 / 2', 'Page 2 / 2']);
    await expect(webviewFrame.getByText(/PDFを表示できませんでした:/)).toHaveCount(0);

    await expectWebviewNetworkBlocked(webviewFrame);

    await settings
      .getByRole('spinbutton', { name: 'Left', exact: true })
      .fill(cropConfigureFixture.cropBox.left.toString());
    await settings
      .getByRole('spinbutton', { name: 'Bottom', exact: true })
      .fill(cropConfigureFixture.cropBox.bottom.toString());
    await settings
      .getByRole('spinbutton', { name: 'Right', exact: true })
      .fill(cropConfigureFixture.cropBox.right.toString());
    await settings
      .getByRole('spinbutton', { name: 'Top', exact: true })
      .fill(cropConfigureFixture.cropBox.top.toString());
    await expect(settings.getByRole('radio', { name: 'All pages', exact: true })).toBeChecked();
    await expectPdfCanvasesReadable(canvases);

    await settings.getByRole('button', { name: 'Apply', exact: true }).click();

    await expect
      .poll(async () => {
        try {
          const outputDocument = await PDFDocument.load(await readFile(env!.outputPath));
          return outputDocument.getPageCount();
        } catch {
          return 0;
        }
      })
      .toBe(2);

    const outputDocument = await PDFDocument.load(await readFile(env!.outputPath));
    expect(outputDocument.getPageCount()).toBe(2);

    for (const page of outputDocument.getPages()) {
      expect(page.getMediaBox()).toEqual(expectedCropBox);
      expect(page.getCropBox()).toEqual(expectedCropBox);
    }

    expect(await readFile(env!.inputPath)).toEqual(env!.sourceFixtureBytes);

    const successNotification = env!.window.getByText('Cropped 1 PDF file(s).', {
      exact: true,
    });
    await expect(successNotification).toBeVisible();
    await env!.window.keyboard.press('Escape');
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('dark/light themeへ追従しcanvasが読める', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const { body, canvases } = await openCropPdfConfigure(env.window, cropConfigureFixture.fileName);

    const darkTheme = await waitForWebviewTheme(body, 'vscode-dark');
    await expectPdfCanvasesReadable(canvases);
    const darkScreenshot = await captureCropPdfScreenshot(env.window, body);
    await testInfo.attach('crop-pdf-configure-dark', {
      body: darkScreenshot,
      contentType: 'image/png',
    });

    if (process.platform === 'linux') {
      expect(darkScreenshot).toMatchSnapshot('crop-pdf-configure-dark.png', {
        maxDiffPixelRatio: 0.005,
      });
    }

    const userSettingsPath = join(env.userDataDir, 'User', 'settings.json');
    await writeVscodeUserSettings(userSettingsPath, alternateTheme, {
      'latex-graphics-helper.execPath.pdftocairo':
        process.platform === 'win32' ? 'C:\\lgh-missing\\pdftocairo.exe' : '/lgh-missing/pdftocairo',
    });

    const lightTheme = await waitForWebviewTheme(body, 'vscode-light');
    expect(lightTheme.bodyBackground).not.toBe(darkTheme.bodyBackground);
    expect(lightTheme.bodyForeground).not.toBe(darkTheme.bodyForeground);
    await expectPdfCanvasesReadable(
      canvases,
      'PDF canvas rendering became unreadable after switching the VS Code theme.',
    );
    const lightScreenshot = await captureCropPdfScreenshot(env.window, body, {
      canvases,
      snapshotPrefix: join(env!.temporaryRoot, 'crop-pdf-light'),
    });
    await testInfo.attach('crop-pdf-configure-light', {
      body: lightScreenshot,
      contentType: 'image/png',
    });

    if (process.platform === 'linux') {
      expect(lightScreenshot).toMatchSnapshot('crop-pdf-configure-light.png', {
        maxDiffPixelRatio: 0.005,
      });
    }
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('package済みmoduleでMergeが動く', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const mergedOutputPath = join(env.workspacePath, 'packaged-merged.pdf');

    // Copy input fixture to output path so we have two PDFs to merge
    await writeFile(env.outputPath, env.sourceFixtureBytes);

    const mergeModule = await loadPackagedOperation<PackagedMergePdfModule>(
      env.extensionPath,
      'out/operations/pdf/merge_pdf.js',
    );
    await mergeModule.mergePdf({
      sourcePaths: [env.inputPath, env.outputPath],
      outputPath: mergedOutputPath,
      workspacePath: env.workspacePath,
      runId: 'packaged-merge',
      runtime: { resolveConflicts: async () => 'overwrite' },
    });

    const mergedDocument = await PDFDocument.load(await readFile(mergedOutputPath));
    expect(mergedDocument.getPageCount()).toBe(4);
    expect(await readFile(env.inputPath)).toEqual(env.sourceFixtureBytes);
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('package済みmoduleでSplitが動く', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const splitOutputDirectory = join(env.workspacePath, 'packaged-split');

    const splitModule = await loadPackagedOperation<PackagedSplitPdfModule>(
      env.extensionPath,
      'out/operations/pdf/split_pdf.js',
    );
    const splitOutputs = await splitModule.splitPdfAllPages({
      jobs: [
        {
          sourcePath: env.inputPath,
          workspacePath: env.workspacePath,
          outputPathForPage: (page) => join(splitOutputDirectory, `${page}.pdf`),
        },
      ],
      runId: 'packaged-split',
      runtime: { resolveConflicts: async () => 'overwrite' },
    });

    expect(splitOutputs).toHaveLength(2);
    for (const splitOutput of splitOutputs) {
      const splitDocument = await PDFDocument.load(await readFile(splitOutput.outputPath));
      expect(splitDocument.getPageCount()).toBe(1);
    }
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('native Sharp dependencyをloadしてPNG→JPEG変換できる', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const rasterOutputPath = join(env.workspacePath, 'packaged-raster-input.jpeg');

    await convertPngToJpeg(env.window, 'packaged-raster-input.png');
    await expect
      .poll(async () => {
        try {
          return (await readFile(rasterOutputPath)).length > 0;
        } catch {
          return false;
        }
      })
      .toBe(true);
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('外部networkが遮断されている', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    const { frame: webviewFrame } = await openCropPdfConfigure(env.window, cropConfigureFixture.fileName);
    await expectWebviewNetworkBlocked(webviewFrame);
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});

test('pdftocairo欠損時に期待するfailureになる', async ({ playwright }, testInfo) => {
  testInfo.setTimeout(240_000);
  let env: ElectronTestEnv | undefined;
  const consoleMessages: string[] = [];

  try {
    env = await setupElectronTest(playwright._electron, packagedVsixPath);
    env.electronApp.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    await convertPdfToJpeg(env.window, cropConfigureFixture.fileName);
    await expect(env!.window.getByRole('alert').filter({ hasText: 'Failed to convert to JPEG:' })).toBeVisible();

    const failedPdfJpegOutputPaths = [1, 2].map((page) => join(env!.workspacePath, `q a-${page}.jpeg`));
    for (const failedOutputPath of failedPdfJpegOutputPaths) {
      await expect
        .poll(async () => {
          try {
            await readFile(failedOutputPath);
            return false;
          } catch {
            return true;
          }
        })
        .toBe(true);
    }
    await env!.window.keyboard.press('Escape');
  } catch (error) {
    await attachElectronDiagnostics({
      consoleMessages,
      error,
      extensionsDir: env?.extensionsDir ?? '',
      sharedDataDir: env?.sharedDataDir ?? '',
      temporaryRoot: env?.temporaryRoot ?? '',
      testInfo,
      userDataDir: env?.userDataDir ?? '',
      window: env?.window,
      workspacePath: env?.workspacePath ?? '',
    });
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    if (env) {
      await disposeElectronTest(env.electronApp, env.temporaryRoot);
    }
  }
});
