// PDF.js reads this Map method while its module is evaluated, so the polyfill must run first.
// oxlint-disable-next-line import/no-unassigned-import
import './install_map_get_or_insert_computed';

import * as pdfjsModule from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist';

// Vite turns this worker query into an asset URL even though the source module has no default export.
// oxlint-disable-next-line import/default
import pdfJsWorkerUrl from './pdfjs_worker?worker&url';

type PdfJs = typeof pdfjsModule;

let pdfJsWorkerPromise: Promise<Worker> | undefined;

export interface PdfRenderController {
  firstPageReady: Promise<void>;
  dispose: () => Promise<void>;
}

export async function renderFirstPdfPage(
  pdfSrc: string,
  canvas: HTMLCanvasElement,
  options: PdfRenderOptions = {},
): Promise<void> {
  const pdfjs = await loadPdfJs();

  if (options.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  }

  const loadingTask = pdfjs.getDocument(createDocumentOptions(pdfSrc, options));
  const document = await loadingTask.promise;

  try {
    const page = await document.getPage(1);
    await renderPageToCanvas(page, canvas);
    page.cleanup();
  } finally {
    await document.cleanup();
    await loadingTask.destroy();
  }
}

export async function renderPdfPages(
  pdfSrc: string,
  container: HTMLElement,
  options: PdfRenderOptions = {},
): Promise<PdfRenderController> {
  const pdfjs = await loadPdfJs();

  if (options.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = options.workerSrc;
  }

  const loadingTask = pdfjs.getDocument(createDocumentOptions(pdfSrc, options));
  const document = await loadingTask.promise;
  const renderPromises = new Map<number, Promise<void>>();
  const pages = new Map<number, PDFPageProxy>();
  const renderTasks = new Set<ReturnType<PDFPageProxy['render']>>();
  let disposed = false;

  container.replaceChildren();
  const pageFrames: HTMLElement[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pageFrame = container.ownerDocument.createElement('figure');
    pageFrame.className = 'pdf-page';
    pageFrame.dataset.pdfPage = pageNumber.toString();

    const canvas = container.ownerDocument.createElement('canvas');
    canvas.dataset.pdfPage = pageNumber.toString();
    canvas.className = 'pdf-page__canvas';
    canvas.setAttribute('aria-label', `${options.pageLabel ?? 'Page'} ${pageNumber}`);
    pageFrame.append(canvas);

    const footer = container.ownerDocument.createElement('figcaption');
    footer.className = 'pdf-page__footer';
    footer.textContent = `${options.pageLabel ?? 'Page'} ${pageNumber} / ${document.numPages}`;
    pageFrame.append(footer);

    container.append(pageFrame);
    pageFrames.push(pageFrame);
  }

  const renderPage = (pageNumber: number): Promise<void> => {
    const existing = renderPromises.get(pageNumber);

    if (existing) {
      return existing;
    }

    const pageFrame = pageFrames[pageNumber - 1];
    const canvas = pageFrame?.querySelector<HTMLCanvasElement>('canvas[data-pdf-page]');

    if (!canvas) {
      return Promise.reject(new Error(`Could not create PDF page ${pageNumber}.`));
    }

    const renderPromise = (async () => {
      if (disposed) {
        return;
      }

      const page = await document.getPage(pageNumber);
      pages.set(pageNumber, page);

      if (disposed) {
        page.cleanup();
        return;
      }

      const renderTask = renderPageToCanvasWithTask(page, canvas);
      renderTasks.add(renderTask);

      try {
        await renderTask.promise;
      } finally {
        renderTasks.delete(renderTask);
        page.cleanup();
      }
    })().catch((error: unknown) => {
      options.onRenderError?.(error);
      throw error instanceof Error ? error : new Error(String(error));
    });

    renderPromises.set(pageNumber, renderPromise);
    return renderPromise;
  };

  const observer =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) {
                continue;
              }

              const pageNumber = Number((entry.target as unknown as HTMLElement).dataset.pdfPage);
              void renderPage(pageNumber).catch(() => undefined);
            }
          },
          {
            root: options.root ?? null,
            rootMargin: '0px',
          },
        );

  for (const pageFrame of pageFrames) {
    observer?.observe(pageFrame);
  }

  const firstPageReady = renderPage(1);

  return {
    firstPageReady,
    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }

      disposed = true;
      observer?.disconnect();
      for (const renderTask of renderTasks) {
        renderTask.cancel();
      }
      await Promise.allSettled(renderPromises.values());

      for (const page of pages.values()) {
        page.cleanup();
      }

      await document.cleanup();
      await loadingTask.destroy();
    },
  };
}

async function loadPdfJs(): Promise<PdfJs> {
  pdfjsModule.GlobalWorkerOptions.workerSrc = 'pdf.worker.mjs';
  pdfjsModule.GlobalWorkerOptions.workerPort ??= await loadPdfJsWorker();
  return pdfjsModule;
}

async function loadPdfJsWorker(): Promise<Worker> {
  pdfJsWorkerPromise ??= fetch(pdfJsWorkerUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not load the PDF.js worker: ${response.status}.`);
    }

    const workerBlobUrl = URL.createObjectURL(await response.blob());
    return new Worker(workerBlobUrl, { type: 'module' });
  });

  return pdfJsWorkerPromise;
}

interface PdfRenderOptions {
  workerSrc?: string;
  cMapUrl?: string;
  standardFontDataUrl?: string;
  wasmUrl?: string;
  root?: Element;
  pageLabel?: string;
  onRenderError?: (error: unknown) => void;
}

function createDocumentOptions(pdfSrc: string, options: PdfRenderOptions): Parameters<PdfJs['getDocument']>[0] {
  return {
    url: pdfSrc,
    cMapPacked: true,
    useWorkerFetch: false,
    ...(options.cMapUrl ? { cMapUrl: options.cMapUrl } : {}),
    ...(options.standardFontDataUrl ? { standardFontDataUrl: options.standardFontDataUrl } : {}),
    ...(options.wasmUrl ? { wasmUrl: options.wasmUrl } : {}),
  };
}

function renderPageToCanvasWithTask(page: PDFPageProxy, canvas: HTMLCanvasElement): ReturnType<PDFPageProxy['render']> {
  const viewport = page.getViewport({ scale: 1 });
  const outputScale = Math.max(1, globalThis.devicePixelRatio || 1);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create a 2D context for the PDF canvas.');
  }

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.dataset.pdfWidth = viewport.width.toString();
  canvas.dataset.pdfHeight = viewport.height.toString();
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  return page.render({
    canvas,
    canvasContext: context,
    ...(outputScale === 1 ? {} : { transform: [outputScale, 0, 0, outputScale, 0, 0] }),
    viewport,
  });
}

async function renderPageToCanvas(page: PDFPageProxy, canvas: HTMLCanvasElement): Promise<void> {
  await renderPageToCanvasWithTask(page, canvas).promise;
}
