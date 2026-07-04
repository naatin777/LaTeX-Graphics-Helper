import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, normalize, relative } from "node:path";

import { expect, test } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";

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
