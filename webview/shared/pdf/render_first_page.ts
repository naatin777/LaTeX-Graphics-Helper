// PDF.js reads this Map method while its module is evaluated, so the polyfill must run first.
// oxlint-disable-next-line import/no-unassigned-import
import "./install_map_get_or_insert_computed";

import * as pdfjsModule from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";

type PdfJs = typeof pdfjsModule;

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
    const pageFrame = container.ownerDocument.createElement("figure");
    pageFrame.className = "pdf-page";
    pageFrame.dataset.pdfPage = pageNumber.toString();

    const canvas = container.ownerDocument.createElement("canvas");
    canvas.dataset.pdfPage = pageNumber.toString();
    canvas.className = "pdf-page__canvas";
    pageFrame.append(canvas);

    const footer = container.ownerDocument.createElement("figcaption");
    footer.className = "pdf-page__footer";
    footer.textContent = `Page ${pageNumber} / ${document.numPages}`;
    pageFrame.append(footer);

    container.append(pageFrame);

    const page = await document.getPage(pageNumber);
    await renderPageToCanvas(page, canvas);
  }
}

async function loadPdfJs(): Promise<PdfJs> {
  pdfjsModule.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
  return pdfjsModule;
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

async function renderPageToCanvas(page: PDFPageProxy, canvas: HTMLCanvasElement): Promise<void> {
  const viewport = page.getViewport({ scale: 1 });
  const outputScale = Math.max(1, globalThis.devicePixelRatio || 1);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create a 2D context for the PDF canvas.");
  }

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.dataset.pdfWidth = viewport.width.toString();
  canvas.dataset.pdfHeight = viewport.height.toString();
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  await page.render({
    canvas,
    canvasContext: context,
    ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }),
    viewport,
  }).promise;
}
