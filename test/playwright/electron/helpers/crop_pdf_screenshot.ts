import { type Locator, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export async function captureCropPdfScreenshot(
  page: Page,
  body: Locator,
  canvasFallback?: { canvases: Locator; snapshotPrefix: string },
): Promise<Buffer> {
  await body.evaluate((element) => {
    const document = element.ownerDocument;

    if (!document.querySelector('style[data-e2e-snapshot]')) {
      const style = document.createElement('style');
      style.dataset.e2eSnapshot = 'true';
      style.textContent =
        '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';
      document.head.append(style);
    }
  });
  const bodyBounds = await body.boundingBox();

  if (!bodyBounds) {
    throw new Error('Crop PDF Configure webview body has no visible bounds.');
  }

  if (!canvasFallback) {
    return page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      clip: bodyBounds,
    });
  }

  const { canvases, snapshotPrefix } = canvasFallback;
  const previewBounds = await body.locator('.pdf-preview').boundingBox();

  if (!previewBounds) {
    throw new Error('PDF preview has no visible bounds.');
  }

  const canvasImages = await Promise.all(
    (await canvases.all()).map(async (canvas) => {
      const [bounds, dataUrl] = await Promise.all([
        canvas.boundingBox(),
        canvas.evaluate((element) =>
          (element as unknown as { toDataURL: (type: string) => string }).toDataURL('image/png'),
        ),
      ]);

      if (!bounds) {
        throw new Error('A PDF canvas has no visible bounds.');
      }

      return {
        bounds,
        image: Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'),
      };
    }),
  );
  const baseScreenshotPath = `${snapshotPrefix}-base.png`;
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    clip: bodyBounds,
    path: baseScreenshotPath,
  });
  const baseScreenshotBuffer = await readFile(baseScreenshotPath);
  const metadata = await sharp(baseScreenshotBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('VS Code Webview screenshot has no dimensions.');
  }

  const scaleX = metadata.width / bodyBounds.width;
  const scaleY = metadata.height / bodyBounds.height;
  // PlaywrightはOOPIF内のcanvasを黒く取得する場合があるため、
  // pdf.jsが実Webviewで描画したcanvasを同じ座標へ合成する。
  const overlays = await Promise.all(
    canvasImages.map(async ({ bounds, image }, index) => {
      const imageMetadata = await sharp(image).metadata();

      if (!imageMetadata.width || !imageMetadata.height) {
        throw new Error('A PDF canvas screenshot has no dimensions.');
      }

      const visibleLeft = Math.max(bounds.x, previewBounds.x);
      const visibleTop = Math.max(bounds.y, previewBounds.y);
      const visibleRight = Math.min(bounds.x + bounds.width, previewBounds.x + previewBounds.width);
      const visibleBottom = Math.min(bounds.y + bounds.height, previewBounds.y + previewBounds.height);
      const sourceLeft = Math.max(0, Math.floor(((visibleLeft - bounds.x) / bounds.width) * imageMetadata.width));
      const sourceTop = Math.max(0, Math.floor(((visibleTop - bounds.y) / bounds.height) * imageMetadata.height));
      const sourceWidth = Math.min(
        imageMetadata.width - sourceLeft,
        Math.max(1, Math.ceil(((visibleRight - visibleLeft) / bounds.width) * imageMetadata.width)),
      );
      const sourceHeight = Math.min(
        imageMetadata.height - sourceTop,
        Math.max(1, Math.ceil(((visibleBottom - visibleTop) / bounds.height) * imageMetadata.height)),
      );
      const overlayPath = `${snapshotPrefix}-canvas-${index}.png`;
      await sharp(image)
        .extract({
          left: sourceLeft,
          top: sourceTop,
          width: sourceWidth,
          height: sourceHeight,
        })
        .flatten({ background: '#ffffff' })
        .resize({
          width: Math.max(1, Math.round((visibleRight - visibleLeft) * scaleX)),
          height: Math.max(1, Math.round((visibleBottom - visibleTop) * scaleY)),
        })
        .png()
        .toFile(overlayPath);
      return {
        input: overlayPath,
        left: Math.max(0, Math.round((visibleLeft - bodyBounds.x) * scaleX)),
        top: Math.max(0, Math.round((visibleTop - bodyBounds.y) * scaleY)),
      };
    }),
  );

  return sharp(baseScreenshotBuffer).composite(overlays).png().toBuffer();
}
