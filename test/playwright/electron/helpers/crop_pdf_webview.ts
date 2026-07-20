import { expect, type Frame, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

export interface CropPdfWebview {
  body: Locator;
  canvases: Locator;
  frame: Frame;
  preview: Locator;
  settings: Locator;
}

export interface WebviewThemeState {
  bodyBackground: string;
  bodyForeground: string;
}

export async function openCropPdfConfigure(vscodeWindow: Page, fileName: string): Promise<CropPdfWebview> {
  await expect(vscodeWindow.getByText('Safe Mode: ON', { exact: true })).toBeVisible();

  const explorer = vscodeWindow.getByRole('tree', { name: 'Files Explorer' });
  await expect(explorer).toBeVisible();

  const pdfEntry = explorer.getByRole('treeitem', { name: fileName });
  await expect(pdfEntry).toBeVisible();
  await selectExplorerEntry(pdfEntry);
  await pdfEntry.press('Shift+F10');

  const cropPdfMenu = vscodeWindow.getByRole('menuitem', { name: 'Crop PDF' });
  await expect(cropPdfMenu).toBeVisible();
  await cropPdfMenu.hover();
  await vscodeWindow.keyboard.press('ArrowRight');

  const configureMenu = vscodeWindow.getByRole('menuitem', { name: 'Configure crop' });
  await expect(configureMenu).toBeVisible();
  await configureMenu.hover();
  await expect(configureMenu).toBeFocused();
  await vscodeWindow.keyboard.press('Enter');

  let webviewFrame: Frame | undefined;
  await expect
    .poll(
      async () => {
        for (const frame of vscodeWindow.frames()) {
          const heading = frame.locator('h1').filter({ hasText: /^Custom Crop$/ });
          if ((await heading.count()) > 0) {
            webviewFrame = frame;
            return true;
          }
        }

        return false;
      },
      {
        message: 'Crop PDF Configure webview was not created.',
      },
    )
    .toBe(true);

  if (!webviewFrame) {
    throw new Error('Crop PDF Configure webview was not found after it was created.');
  }

  return {
    body: webviewFrame.locator('body'),
    canvases: webviewFrame.locator('canvas[data-pdf-page]'),
    frame: webviewFrame,
    preview: webviewFrame.getByRole('region', { name: 'PDF preview' }),
    settings: webviewFrame.getByRole('region', { name: 'Crop settings' }),
  };
}

export async function convertPngToJpeg(vscodeWindow: Page, fileName: string): Promise<void> {
  const explorer = vscodeWindow.getByRole('tree', { name: 'Files Explorer' });
  const pngEntry = explorer.getByRole('treeitem', { name: fileName });
  await expect(pngEntry).toBeVisible();
  await selectExplorerEntry(pngEntry);
  await pngEntry.press('Shift+F10');

  const convertMenu = vscodeWindow.getByRole('menuitem', { name: 'Convert' });
  await expect(convertMenu).toBeVisible();
  await convertMenu.hover();

  const jpegMenu = vscodeWindow.getByRole('menuitem', { name: 'JPEG' });
  await expect(jpegMenu).toBeVisible();
  await jpegMenu.hover();
  await expect(jpegMenu).toBeFocused();
  await vscodeWindow.keyboard.press('Enter');

  const successNotification = vscodeWindow.getByRole('alert').filter({ hasText: 'Converted 1 file(s) to JPEG.' });
  await expect(successNotification).toBeVisible();
  await vscodeWindow.keyboard.press('Escape');
}

export async function convertPdfToJpeg(vscodeWindow: Page, fileName: string): Promise<void> {
  const explorer = vscodeWindow.getByRole('tree', { name: 'Files Explorer' });
  const pdfEntry = explorer.getByRole('treeitem', { name: fileName });
  await expect(pdfEntry).toBeVisible();
  await selectExplorerEntry(pdfEntry);
  await pdfEntry.click({ button: 'right' });

  const convertMenu = vscodeWindow.getByRole('menuitem', { name: 'Convert' });
  await expect(convertMenu).toBeVisible();
  await convertMenu.hover();

  const jpegMenu = vscodeWindow.getByRole('menuitem', { name: 'JPEG' });
  await expect(jpegMenu).toBeVisible();
  await jpegMenu.hover();
  await expect(jpegMenu).toBeFocused();
  await vscodeWindow.keyboard.press('Enter');
}

async function selectExplorerEntry(entry: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        if ((await entry.getAttribute('aria-selected')) === 'true') {
          return true;
        }

        await entry.click();
        return (await entry.getAttribute('aria-selected')) === 'true';
      },
      { message: 'Explorer entry was not selected.' },
    )
    .toBe(true);
}

export async function expectPdfCanvasesReadable(canvases: Locator, message?: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const whitePixelRatios = await captureCanvasWhitePixelRatios(canvases);
        return whitePixelRatios.every((ratio) => ratio >= 0.2);
      },
      message ? { message } : undefined,
    )
    .toBe(true);
}

export async function expectWebviewNetworkBlocked(frame: Frame): Promise<void> {
  const externalRequestSucceeded = await frame.evaluate(async () => {
    try {
      await fetch('https://example.com', { signal: AbortSignal.timeout(2_000) });
      return true;
    } catch {
      return false;
    }
  });

  expect(externalRequestSucceeded).toBe(false);
}

export async function waitForWebviewTheme(
  body: Locator,
  themeClass: 'vscode-dark' | 'vscode-light',
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
        const panel = browser.document.querySelector('.panel');
        const input = browser.document.querySelector('.input');
        const primaryButton = browser.document.querySelector('.button--primary');

        if (!panel || !input || !primaryButton) {
          return false;
        }

        const requiredVariables = [
          '--vscode-foreground',
          '--vscode-editor-background',
          '--vscode-descriptionForeground',
          '--vscode-sideBar-background',
          '--vscode-input-foreground',
          '--vscode-input-background',
          '--vscode-button-foreground',
          '--vscode-button-background',
          '--vscode-button-secondaryForeground',
          '--vscode-button-secondaryBackground',
        ];
        const computedStyles = [
          browser.getComputedStyle(element),
          browser.getComputedStyle(panel),
          browser.getComputedStyle(input),
          browser.getComputedStyle(primaryButton),
        ];

        return (
          requiredVariables.every((variableName) => rootStyle.getPropertyValue(variableName).trim().length > 0) &&
          computedStyles.every(
            (style) =>
              style.color.length > 0 &&
              style.color !== 'transparent' &&
              style.color !== 'rgba(0, 0, 0, 0)' &&
              style.backgroundColor.length > 0 &&
              style.backgroundColor !== 'transparent' &&
              style.backgroundColor !== 'rgba(0, 0, 0, 0)',
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

async function captureCanvasWhitePixelRatios(canvases: Locator): Promise<number[]> {
  const dataUrls = await canvases.evaluateAll((elements) =>
    elements.map((element) => (element as unknown as { toDataURL: (type: string) => string }).toDataURL('image/png')),
  );

  return Promise.all(
    dataUrls.map(async (dataUrl) => {
      const image = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      const { data, info } = await sharp(image)
        .flatten({ background: '#ffffff' })
        .raw()
        .toBuffer({ resolveWithObject: true });
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
