import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";

export async function renderFirstPdfPage(pdfSrc: string, canvas: HTMLCanvasElement): Promise<void> {
  const document = await pdfjs.getDocument({ url: pdfSrc }).promise;
  const page = await document.getPage(1);
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
