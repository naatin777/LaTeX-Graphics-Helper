export function applyPreviewZoom(container: HTMLDivElement | undefined, zoom: number): void {
  const canvases = container?.querySelectorAll<HTMLCanvasElement>("canvas[data-pdf-page]");

  if (!canvases) {
    return;
  }

  for (const canvas of canvases) {
    const width = Number(canvas.dataset.pdfWidth);
    const height = Number(canvas.dataset.pdfHeight);

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      continue;
    }

    canvas.style.width = `${width * zoom}px`;
    canvas.style.height = `${height * zoom}px`;
  }
}

export interface PreviewZoomAnchor {
  canvas: HTMLCanvasElement;
  clientX: number;
  clientY: number;
  xRatio: number;
  yRatio: number;
}

export function capturePreviewZoomAnchor(
  preview: HTMLElement | undefined,
  target?: EventTarget | null,
  clientX?: number,
  clientY?: number,
): PreviewZoomAnchor | undefined {
  if (!preview) {
    return undefined;
  }

  const previewBounds = preview.getBoundingClientRect();
  const anchorClientX = clientX ?? previewBounds.left + preview.clientWidth / 2;
  const anchorClientY = clientY ?? previewBounds.top + preview.clientHeight / 2;
  const targetElement = target instanceof Element ? target : undefined;
  const targetCanvas = targetElement?.closest<HTMLCanvasElement>("canvas[data-pdf-page]");
  const canvas =
    targetCanvas ??
    [...preview.querySelectorAll<HTMLCanvasElement>("canvas[data-pdf-page]")].find((candidate) => {
      const bounds = candidate.getBoundingClientRect();

      return (
        anchorClientX >= bounds.left &&
        anchorClientX <= bounds.right &&
        anchorClientY >= bounds.top &&
        anchorClientY <= bounds.bottom
      );
    });

  if (!canvas) {
    return undefined;
  }

  const canvasBounds = canvas.getBoundingClientRect();

  return {
    canvas,
    clientX: anchorClientX,
    clientY: anchorClientY,
    xRatio: (anchorClientX - canvasBounds.left) / canvasBounds.width,
    yRatio: (anchorClientY - canvasBounds.top) / canvasBounds.height,
  };
}

export function restorePreviewZoomAnchor(
  preview: HTMLElement | undefined,
  anchor: PreviewZoomAnchor | undefined,
): void {
  if (!preview || !anchor || !anchor.canvas.isConnected) {
    return;
  }

  const canvasBounds = anchor.canvas.getBoundingClientRect();
  const nextClientX = canvasBounds.left + canvasBounds.width * anchor.xRatio;
  const nextClientY = canvasBounds.top + canvasBounds.height * anchor.yRatio;

  preview.scrollLeft += nextClientX - anchor.clientX;
  preview.scrollTop += nextClientY - anchor.clientY;
}

export function clampPreviewZoom(value: number): number {
  return Math.min(4, Math.max(0.25, Math.round(value * 100) / 100));
}
