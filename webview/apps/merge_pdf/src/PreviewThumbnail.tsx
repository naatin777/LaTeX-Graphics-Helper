import { Show, createSignal, onCleanup, onMount } from 'solid-js';

import { renderFirstPdfPage } from '@webview-shared/pdf/render_pdf_pages';

import type { ExtensionToWebviewMessage, MergePdfLabels, MergePdfSource } from './messages';
import { vscode } from './vscode';

export type PdfOptions = Partial<
  Pick<
    Extract<ExtensionToWebviewMessage, { type: 'init' }>['payload'],
    'workerSrc' | 'cMapUrl' | 'standardFontDataUrl' | 'wasmUrl'
  >
>;

export function PreviewThumbnail(props: {
  source: MergePdfSource;
  options: PdfOptions;
  labels: MergePdfLabels;
  onError: () => void;
}) {
  const [status, setStatus] = createSignal<'waiting' | 'loading' | 'ready' | 'error'>('waiting');
  let canvas: HTMLCanvasElement | undefined;
  let frame: HTMLDivElement | undefined;

  onMount(() => {
    let started = false;

    const renderPreview = () => {
      if (started || !canvas) {
        return;
      }

      started = true;
      setStatus('loading');

      void renderFirstPdfPage(props.source.pdfSrc, canvas, props.options)
        .then(() => setStatus('ready'))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          setStatus('error');
          props.onError();
          vscode.postMessage({ type: 'previewLoadFailed', payload: { message } });
        });
    };

    if (typeof IntersectionObserver === 'undefined' || !frame) {
      renderPreview();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          renderPreview();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(frame);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={(element) => (frame = element)}
      class='thumbnail'
      aria-label={`${props.labels.previewAriaLabel}: ${props.source.fileName}`}
      aria-busy={status() === 'loading'}
    >
      <canvas
        ref={(element) => (canvas = element)}
        class='thumbnail__canvas'
        aria-label={`${props.labels.preview}: ${props.source.fileName}`}
      />
      <Show when={status() === 'waiting' || status() === 'loading'}>
        <span class='thumbnail__status'>{props.labels.previewLoading}</span>
      </Show>
      <Show when={status() === 'error'}>
        <span
          class='thumbnail__status thumbnail__status--error'
          role='img'
          aria-label={props.labels.previewRenderError}
        >
          {props.labels.previewRenderError}
        </span>
      </Show>
    </div>
  );
}
