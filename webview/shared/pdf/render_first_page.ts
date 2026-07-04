import type * as PdfJsModule from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";

type PdfJs = typeof PdfJsModule;

let pdfjsPromise: Promise<PdfJs> | undefined;

export async function renderFirstPdfPage(
  pdfSrc: string,
  canvas: HTMLCanvasElement,
  options: PdfRenderOptions = {},
): Promise<void> {
  const pdfjs = await loadPdfJs();

  if (options.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  }

  const document = await pdfjs.getDocument(createDocumentOptions(pdfSrc, options)).promise;
  const page = await document.getPage(1);
  await renderPageToCanvas(page, canvas);
}

export async function renderPdfPages(
  pdfSrc: string,
  container: HTMLElement,
  options: PdfRenderOptions = {},
): Promise<void> {
  const pdfjs = await loadPdfJs();

  if (options.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  }

  const document = await pdfjs.getDocument(createDocumentOptions(pdfSrc, options)).promise;
  container.replaceChildren();

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.dataset.pdfPage = pageNumber.toString();
    container.append(canvas);

    const page = await document.getPage(pageNumber);
    await renderPageToCanvas(page, canvas);
  }
}

async function loadPdfJs(): Promise<PdfJs> {
  installMapGetOrInsertComputed();
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
    return pdfjs;
  });

  return pdfjsPromise;
}

interface PdfRenderOptions {
  workerSrc?: string;
  cMapUrl?: string;
  standardFontDataUrl?: string;
  wasmUrl?: string;
}

function createDocumentOptions(
  pdfSrc: string,
  options: PdfRenderOptions,
): Parameters<PdfJs["getDocument"]>[0] {
  return {
    url: pdfSrc,
    cMapPacked: true,
    useWorkerFetch: false,
    ...(options.cMapUrl ? { cMapUrl: options.cMapUrl } : {}),
    ...(options.standardFontDataUrl ? { standardFontDataUrl: options.standardFontDataUrl } : {}),
    ...(options.wasmUrl ? { wasmUrl: options.wasmUrl } : {}),
  };
}

function installMapGetOrInsertComputed(): void {
  const mapPrototype = Map.prototype as Map<unknown, unknown> & {
    getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
  };

  if (mapPrototype.getOrInsertComputed) {
    return;
  }

  Object.defineProperty(mapPrototype, "getOrInsertComputed", {
    configurable: true,
    writable: true,
    value(this: Map<unknown, unknown>, key: unknown, callback: (key: unknown) => unknown) {
      if (this.has(key)) {
        return this.get(key);
      }

      const value = callback(key);
      this.set(key, value);
      return value;
    },
  });
}

async function renderPageToCanvas(page: PDFPageProxy, canvas: HTMLCanvasElement): Promise<void> {
  const viewport = page.getViewport({ scale: 1 });
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create a 2D context for the PDF canvas.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;
}
