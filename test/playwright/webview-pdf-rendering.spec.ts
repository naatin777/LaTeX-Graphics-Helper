import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, normalize, relative } from "node:path";

import { expect, test, type Locator } from "@playwright/test";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { cropConfigureFixture } from "../helpers/crop_configure_fixture.js";

const projectRoot = process.cwd();
const webviewRoot = join(projectRoot, "media", "webview");

let server: Server;
let baseUrl: string;
let pdfBytes: Uint8Array;
let cropOperationPdfBytes: Buffer;

test.beforeAll(async () => {
  pdfBytes = await createTestPdf();
  cropOperationPdfBytes = await readFile(
    join(
      projectRoot,
      "test",
      "fixtures",
      "pdf-operations",
      "user-files",
      cropConfigureFixture.fileName,
    ),
  );

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

    if (requestUrl.pathname === "/crop-operation-fixture.pdf") {
      response.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": cropOperationPdfBytes.byteLength,
      });
      response.end(cropOperationPdfBytes);
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

for (const appName of ["crop_pdf"]) {
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

test("crop_pdf renders high-DPI canvases without changing preview layout size", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
  });
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

  const firstPage = page.locator('canvas[data-pdf-page="1"]');
  await expect(firstPage).toBeVisible();
  await expect
    .poll(() =>
      firstPage.evaluate((element) => ({
        pixelWidth: element.width,
        pixelHeight: element.height,
        layoutWidth: element.style.width,
        layoutHeight: element.style.height,
      })),
    )
    .toEqual({
      pixelWidth: 640,
      pixelHeight: 360,
      layoutWidth: "320px",
      layoutHeight: "180px",
    });
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
          canvasCount: child.querySelectorAll("canvas").length,
          footer: child.querySelector(".pdf-page__footer")?.textContent?.trim(),
        })),
      ),
    )
    .toEqual([
      { tagName: "FIGURE", page: "1", canvasCount: 1, footer: "Page 1 / 2" },
      { tagName: "FIGURE", page: "2", canvasCount: 1, footer: "Page 2 / 2" },
    ]);
});

test("crop_pdf uses a two-column layout with preview zoom controls", async ({ page }) => {
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

  await expect(page.getByRole("region", { name: "PDF preview" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Crop settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
  await expect(page.locator(".pdf-page__footer").first()).toHaveText("Page 1 / 2");
});

test("crop_pdf zooms preview display size without changing PDF point crop values", async ({
  page,
}) => {
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

  const firstPage = page.locator('canvas[data-pdf-page="1"]');
  await expect(firstPage).toBeVisible();
  await expect(firstPage).toHaveCSS("width", "320px");

  await page.getByRole("button", { name: "Zoom in" }).click();
  await expect(page.getByText("125%")).toBeVisible();
  await expect(firstPage).toHaveCSS("width", "400px");

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

test("crop_pdf zooms with modified wheel events and clamps the zoom range", async ({ page }) => {
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

  const preview = page.getByRole("region", { name: "PDF preview" });
  const firstPage = page.locator('canvas[data-pdf-page="1"]');
  await expect(firstPage).toBeVisible();

  await preview.dispatchEvent("wheel", {
    deltaY: -100,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  await expect(page.getByText("110%")).toBeVisible();
  await expect(firstPage).toHaveCSS("width", "352px");

  for (let index = 0; index < 60; index += 1) {
    await preview.dispatchEvent("wheel", {
      deltaY: -100,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
  }

  await expect(page.getByText("400%")).toBeVisible();
  await expect(firstPage).toHaveCSS("width", "1280px");

  for (let index = 0; index < 80; index += 1) {
    await preview.dispatchEvent("wheel", {
      deltaY: 100,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
  }

  await expect(page.getByText("25%")).toBeVisible();
  await expect(firstPage).toHaveCSS("width", "80px");
});

test("crop_pdf keeps the PDF point under the pointer while zooming", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 520 });
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

  const preview = page.getByRole("region", { name: "PDF preview" });
  const firstPage = page.locator('canvas[data-pdf-page="1"]');
  await expect(firstPage).toBeVisible();

  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: "Zoom in" }).click();
  }
  await expect(page.getByText("200%")).toBeVisible();

  await preview.evaluate((element) => {
    element.scrollLeft = 100;
    element.scrollTop = 80;
  });

  const pointer = await firstPage.evaluate((canvas) => {
    const canvasBounds = canvas.getBoundingClientRect();
    const previewBounds = canvas.closest(".pdf-preview")?.getBoundingClientRect();

    if (!previewBounds) {
      throw new Error("PDF preview bounds are unavailable.");
    }

    return {
      clientX:
        (Math.max(canvasBounds.left, previewBounds.left) +
          Math.min(canvasBounds.right, previewBounds.right)) /
        2,
      clientY:
        (Math.max(canvasBounds.top, previewBounds.top) +
          Math.min(canvasBounds.bottom, previewBounds.bottom)) /
        2,
    };
  });

  const pointBeforeZoom = await pdfPointAtViewportPosition(firstPage, pointer);

  await firstPage.dispatchEvent("wheel", {
    clientX: pointer.clientX,
    clientY: pointer.clientY,
    deltaY: -100,
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });

  await expect(page.getByText("210%")).toBeVisible();
  await expect
    .poll(async () => {
      const pointAfterZoom = await pdfPointAtViewportPosition(firstPage, pointer);

      return Math.max(
        Math.abs(pointAfterZoom.x - pointBeforeZoom.x),
        Math.abs(pointAfterZoom.y - pointBeforeZoom.y),
      );
    })
    .toBeLessThan(0.001);
  await expect(preview).toBeVisible();
});

test("crop_pdf keeps PDF page scrolling inside the left preview pane", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 360 });
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

  const preview = page.getByRole("region", { name: "PDF preview" });
  const documentElement = page.locator("html");
  const root = page.locator("#root");
  const body = page.locator("body");
  const panel = page.locator(".panel");
  await expect(page.locator('canvas[data-pdf-page="2"]')).toBeVisible();

  await expect
    .poll(async () => ({
      bodyOverflow: await overflowValue(body),
      rootOverflow: await overflowValue(root),
      previewOverflow: await overflowValue(preview),
      panelOverflow: await overflowValue(panel),
      previewCanScroll: await preview.evaluate(
        (element) => element.scrollHeight > element.clientHeight,
      ),
    }))
    .toEqual({
      bodyOverflow: "hidden",
      rootOverflow: "hidden",
      previewOverflow: "auto",
      panelOverflow: "visible",
      previewCanScroll: true,
    });

  await preview.evaluate((element) => {
    element.scrollTop = 40;
  });
  await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBe(40);
  await expect.poll(() => documentElement.evaluate((element) => element.scrollTop)).toBe(0);
  await expect.poll(() => body.evaluate((element) => element.scrollTop)).toBe(0);
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

test("crop_pdfが固定fixtureのcrop範囲と選択ページを送信する", async ({ page }) => {
  await installVsCodeMessageRecorder(page);
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate(
    ({ pdfSrc, fileName }) => {
      (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "init",
            payload: {
              pdfSrc,
              fileName,
              pageCount: 2,
              initialPage: 1,
            },
          },
        }),
      );
    },
    {
      pdfSrc: `${baseUrl}/crop-operation-fixture.pdf`,
      fileName: cropConfigureFixture.fileName,
    },
  );

  await expect(page.locator('canvas[data-pdf-page="1"]')).toBeVisible();
  await page.getByLabel("Left").fill(cropConfigureFixture.cropBox.left.toString());
  await page.getByLabel("Bottom").fill(cropConfigureFixture.cropBox.bottom.toString());
  await page.getByLabel("Right").fill(cropConfigureFixture.cropBox.right.toString());
  await page.getByLabel("Top").fill(cropConfigureFixture.cropBox.top.toString());
  await page.getByLabel("Selected pages").check();
  await page.getByRole("textbox", { name: "Pages" }).fill("1");
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
        cropBox: cropConfigureFixture.cropBox,
        target: {
          type: "selected",
          pages: [1],
        },
      },
    });
});

test("crop_pdfが固定fixtureの操作をキャンセルする", async ({ page }) => {
  await installVsCodeMessageRecorder(page);
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate(
    ({ pdfSrc, fileName }) => {
      (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "init",
            payload: {
              pdfSrc,
              fileName,
              pageCount: 2,
              initialPage: 1,
            },
          },
        }),
      );
    },
    {
      pdfSrc: `${baseUrl}/crop-operation-fixture.pdf`,
      fileName: cropConfigureFixture.fileName,
    },
  );

  await expect(page.locator('canvas[data-pdf-page="1"]')).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const messages = (globalThis as unknown as { __vscodeMessages?: unknown[] })
          .__vscodeMessages;

        return messages?.at(-1);
      }),
    )
    .toEqual({ type: "cancel" });
});

test("crop_pdf rejects empty crop input and non-numeric selected pages", async ({ page }) => {
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

  await expect(page.locator('canvas[data-pdf-page="1"]')).toBeVisible();
  await expect(page.getByLabel("Right")).toHaveValue("320");
  await expect(page.getByLabel("Top")).toHaveValue("180");
  await page.getByLabel("Left").fill("");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toHaveText("left must be a number.");

  await page.getByLabel("Left").fill("0");
  await page.getByLabel("Bottom").fill("0");
  await page.getByLabel("Right").fill("320");
  await page.getByLabel("Top").fill("180");
  await page.getByLabel("Selected pages").check();
  await page.getByRole("textbox", { name: "Pages" }).fill("abc");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toHaveText("Page must be a whole number: abc");

  const hasApplyMessage = await page.evaluate(() => {
    const messages = (globalThis as unknown as { __vscodeMessages?: unknown[] }).__vscodeMessages;

    return messages?.some((message) => {
      return (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "apply"
      );
    });
  });

  expect(hasApplyMessage).toBe(false);
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

test("crop_pdfが固定fixtureの全ページcropを送信する", async ({ page }) => {
  await installVsCodeMessageRecorder(page);
  await page.goto(`${baseUrl}/crop_pdf/index.html`);

  await page.evaluate(
    ({ pdfSrc, fileName }) => {
      (globalThis as unknown as { dispatchEvent(event: MessageEvent): boolean }).dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "init",
            payload: {
              pdfSrc,
              fileName,
              pageCount: 2,
              initialPage: 1,
            },
          },
        }),
      );
    },
    {
      pdfSrc: `${baseUrl}/crop-operation-fixture.pdf`,
      fileName: cropConfigureFixture.fileName,
    },
  );

  await expect(page.locator('canvas[data-pdf-page="1"]')).toBeVisible();
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
        cropBox: cropConfigureFixture.fullPageBox,
        target: {
          type: "all",
        },
      },
    });
});

async function pdfPointAtViewportPosition(
  canvas: Locator,
  pointer: { clientX: number; clientY: number },
): Promise<{ x: number; y: number }> {
  return canvas.evaluate((element, position) => {
    const bounds = element.getBoundingClientRect();

    return {
      x: (position.clientX - bounds.left) / bounds.width,
      y: (position.clientY - bounds.top) / bounds.height,
    };
  }, pointer);
}

async function overflowValue(element: Locator): Promise<string> {
  return element.evaluate(
    (target) => target.ownerDocument.defaultView?.getComputedStyle(target).overflow ?? "",
  );
}

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
