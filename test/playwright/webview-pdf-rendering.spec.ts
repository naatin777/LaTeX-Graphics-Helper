import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, normalize, relative } from "node:path";

import { expect, test } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const projectRoot = process.cwd();
const webviewRoot = join(projectRoot, "media", "webview");

let server: Server;
let baseUrl: string;
let pdfBytes: Uint8Array;

test.beforeAll(async () => {
  pdfBytes = await createTestPdf();

  server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (requestUrl.pathname === "/fixture.pdf") {
      response.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": pdfBytes.byteLength,
      });
      response.end(pdfBytes);
      return;
    }

    const filePath = resolveWebviewFile(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    try {
      const file = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": contentType(filePath),
        "Content-Length": file.byteLength,
      });
      response.end(file);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not determine the Playwright test server address.");
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

for (const appName of ["crop_pdf", "merge_pdf"]) {
  test(`${appName} renders the first PDF page`, async ({ page }) => {
    await page.goto(`${baseUrl}/${appName}/index.html`);

    await page.evaluate((pdfSrc) => {
      (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "init",
            payload: {
              pdfSrc,
            },
          },
        }),
      );
    }, `${baseUrl}/fixture.pdf`);

    const canvas = page.locator('canvas[data-pdf-page="1"]');

    await expect(canvas).toBeVisible();
    await expect
      .poll(() => canvas.evaluate((element) => element.width > 0 && element.height > 0))
      .toBe(true);

    await expect
      .poll(() =>
        canvas.evaluate((element) => {
          const context = element.getContext("2d");

          if (!context) {
            throw new Error("PDF canvas does not have a 2D rendering context.");
          }

          const sample = (xRatio: number, yRatio: number) => {
            const x = Math.floor(element.width * xRatio);
            const y = Math.floor(element.height * yRatio);
            const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(x, y, 1, 1).data;

            return { red, green, blue, alpha };
          };

          return {
            topLeft: sample(0.25, 0.25),
            topRight: sample(0.75, 0.25),
            bottomLeft: sample(0.25, 0.75),
            bottomRight: sample(0.75, 0.75),
          };
        }),
      )
      .toEqual({
        topLeft: { red: 255, green: 0, blue: 0, alpha: 255 },
        topRight: { red: 0, green: 255, blue: 0, alpha: 255 },
        bottomLeft: { red: 0, green: 0, blue: 255, alpha: 255 },
        bottomRight: { red: 255, green: 255, blue: 0, alpha: 255 },
      });
  });
}

test("crop_pdf accepts configure init payload and renders the first PDF page", async ({ page }) => {
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate((pdfSrc) => {
    (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "init",
          payload: {
            pdfSrc,
            fileName: "fixture.pdf",
            pageCount: 2,
            initialPage: 1,
          },
        },
      }),
    );
  }, `${baseUrl}/fixture.pdf`);

  const canvas = page.locator('canvas[data-pdf-page="1"]');

  await expect(canvas).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((element) => element.width > 0 && element.height > 0))
    .toBe(true);
});

test("crop_pdf renders all PDF pages as a list", async ({ page }) => {
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate((pdfSrc) => {
    (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "init",
          payload: {
            pdfSrc,
            fileName: "fixture.pdf",
            pageCount: 2,
            initialPage: 1,
          },
        },
      }),
    );
  }, `${baseUrl}/fixture.pdf`);

  const pages = page.locator("canvas[data-pdf-page]");
  await expect(pages).toHaveCount(2);

  await expect
    .poll(() =>
      pages.evaluateAll((elements) =>
        elements.map((element) => ({
          page: element.getAttribute("data-pdf-page"),
          width: Number(element.getAttribute("width")),
          height: Number(element.getAttribute("height")),
        })),
      ),
    )
    .toEqual([
      { page: "1", width: 320, height: 180 },
      { page: "2", width: 200, height: 120 },
    ]);
});

test("crop_pdf keeps the preview canvas-only without text or annotation layers", async ({
  page,
}) => {
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate((pdfSrc) => {
    (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "init",
          payload: {
            pdfSrc,
            fileName: "fixture.pdf",
            pageCount: 2,
            initialPage: 1,
          },
        },
      }),
    );
  }, `${baseUrl}/fixture.pdf`);

  await expect(page.locator("canvas[data-pdf-page]")).toHaveCount(2);
  await expect(page.locator(".textLayer")).toHaveCount(0);
  await expect(page.locator(".annotationLayer")).toHaveCount(0);
  await expect(page.locator('span[role="presentation"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator(".pdf-preview__pages").evaluate((element) =>
        [...element.children].map((child) => ({
          tagName: child.tagName,
          page: child.getAttribute("data-pdf-page"),
        })),
      ),
    )
    .toEqual([
      { tagName: "CANVAS", page: "1" },
      { tagName: "CANVAS", page: "2" },
    ]);
});

test("crop_pdf ships PDF.js auxiliary assets for text rendering", async () => {
  await Promise.all([
    readFile(join(webviewRoot, "crop_pdf", "standard_fonts", "LiberationSans-Regular.ttf")),
    readFile(join(webviewRoot, "crop_pdf", "cmaps", "Adobe-Japan1-UCS2.bcmap")),
    readFile(join(webviewRoot, "crop_pdf", "wasm", "openjpeg.wasm")),
  ]);
});

test("crop_pdf renders a text PDF with PDF.js auxiliary asset URLs", async ({ page }) => {
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate(
    ({ pdfSrc, assetBaseUrl }) => {
      (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "init",
            payload: {
              pdfSrc,
              fileName: "fixture.pdf",
              pageCount: 2,
              initialPage: 1,
              cMapUrl: `${assetBaseUrl}/crop_pdf/cmaps/`,
              standardFontDataUrl: `${assetBaseUrl}/crop_pdf/standard_fonts/`,
              wasmUrl: `${assetBaseUrl}/crop_pdf/wasm/`,
            },
          },
        }),
      );
    },
    { pdfSrc: `${baseUrl}/fixture.pdf`, assetBaseUrl: baseUrl },
  );

  await expect(page.locator('canvas[data-pdf-page="1"]')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('canvas[data-pdf-page="1"]').evaluate((element) => {
        const context = element.getContext("2d");

        if (!context) {
          throw new Error("PDF canvas does not have a 2D rendering context.");
        }

        const image = context.getImageData(0, 0, element.width, element.height).data;

        for (let index = 0; index < image.length; index += 4) {
          const red = image[index] ?? 0;
          const green = image[index + 1] ?? 0;
          const blue = image[index + 2] ?? 0;
          const alpha = image[index + 3] ?? 0;

          if (alpha === 255 && red < 16 && green < 16 && blue < 16) {
            return true;
          }
        }

        return false;
      }),
    )
    .toBe(true);
});

test("crop_pdf renders the first PDF page when Chromium lacks Map getOrInsertComputed", async ({
  page,
}) => {
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate((pdfSrc) => {
    delete (Map.prototype as Map<unknown, unknown> & { getOrInsertComputed?: unknown })
      .getOrInsertComputed;

    (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "init",
          payload: {
            pdfSrc,
            fileName: "fixture.pdf",
            pageCount: 2,
            initialPage: 1,
          },
        },
      }),
    );
  }, `${baseUrl}/fixture.pdf`);

  const canvas = page.locator('canvas[data-pdf-page="1"]');

  await expect(canvas).toBeVisible();
  await expect
    .poll(() => canvas.evaluate((element) => element.width > 0 && element.height > 0))
    .toBe(true);
});

test("crop_pdf sends apply message with cropBox and all-pages target", async ({ page }) => {
  await installVsCodeMessageRecorder(page);
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate((pdfSrc) => {
    (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "init",
          payload: {
            pdfSrc,
            fileName: "fixture.pdf",
            pageCount: 2,
            initialPage: 1,
          },
        },
      }),
    );
  }, `${baseUrl}/fixture.pdf`);

  await page.getByRole("button", { name: "Apply" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const messages = (globalThis as unknown as { __vscodeMessages?: unknown[] })
          .__vscodeMessages;

        return messages?.at(-1);
      }),
    )
    .toEqual({
      type: "apply",
      payload: {
        cropBox: {
          left: 0,
          bottom: 0,
          right: 320,
          top: 180,
        },
        target: {
          type: "all",
        },
      },
    });
});

async function createTestPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([320, 180]);
  const font = await document.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: 90,
    width: 160,
    height: 90,
    color: rgb(1, 0, 0),
  });
  page.drawRectangle({
    x: 160,
    y: 90,
    width: 160,
    height: 90,
    color: rgb(0, 1, 0),
  });
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 160,
    height: 90,
    color: rgb(0, 0, 1),
  });
  page.drawRectangle({
    x: 160,
    y: 0,
    width: 160,
    height: 90,
    color: rgb(1, 1, 0),
  });
  page.drawText("LaTeX Graphics Helper", {
    x: 24,
    y: 78,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });

  const secondPage = document.addPage([200, 120]);
  secondPage.drawRectangle({
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    color: rgb(0.5, 0, 1),
  });

  return document.save();
}

function resolveWebviewFile(pathname: string): string | undefined {
  const relativePath = pathname.replace(/^\/+/, "");
  const resolvedPath = normalize(join(webviewRoot, relativePath));
  const resolvedRelativePath = relative(webviewRoot, resolvedPath);

  if (resolvedRelativePath.startsWith("..") || isAbsolute(resolvedRelativePath)) {
    return undefined;
  }

  return resolvedPath;
}

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function installVsCodeMessageRecorder(page: {
  addInitScript(script: () => void): Promise<unknown>;
}): Promise<void> {
  await page.addInitScript(() => {
    const messages: unknown[] = [];

    Object.defineProperty(globalThis, "__vscodeMessages", {
      value: messages,
      configurable: true,
    });

    Object.defineProperty(globalThis, "acquireVsCodeApi", {
      value: () => ({
        postMessage(message: unknown) {
          messages.push(message);
        },
        getState() {
          return undefined;
        },
        setState() {
          // noop
        },
      }),
      configurable: true,
    });
  });
}
