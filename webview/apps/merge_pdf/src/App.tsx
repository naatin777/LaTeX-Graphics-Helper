import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

import type { ExtensionToWebviewMessage, MergePdfSource } from './messages';
import { defaultLabels } from './labels';
import { SourceCard } from './SourceCard';
import type { PdfOptions } from './PreviewThumbnail';
import { vscode } from './vscode';

export function App() {
  const [sources, setSources] = createSignal<MergePdfSource[]>([]);
  const [pdfOptions, setPdfOptions] = createSignal<PdfOptions>({});
  const [labels, setLabels] = createSignal(defaultLabels);
  const [hostError, setHostError] = createSignal('');
  const [previewErrors, setPreviewErrors] = createSignal(new Set<string>());
  const [draggedSourceId, setDraggedSourceId] = createSignal('');
  const [dropTargetId, setDropTargetId] = createSignal('');

  onMount(() => {
    const handleMessage = (event: MessageEvent<ExtensionToWebviewMessage>) => {
      if (event.data.type === 'error') {
        setHostError(event.data.payload.message);
        return;
      }

      const payload = event.data.payload;
      setSources(payload.sources.slice());
      setPdfOptions({
        ...(payload.workerSrc ? { workerSrc: payload.workerSrc } : {}),
        ...(payload.cMapUrl ? { cMapUrl: payload.cMapUrl } : {}),
        ...(payload.standardFontDataUrl ? { standardFontDataUrl: payload.standardFontDataUrl } : {}),
        ...(payload.wasmUrl ? { wasmUrl: payload.wasmUrl } : {}),
      });
      setLabels(payload.labels);
      setHostError('');
      setPreviewErrors(new Set<string>());
      setDraggedSourceId('');
      setDropTargetId('');
    };

    window.addEventListener('message', handleMessage);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin
    vscode.postMessage({ type: 'ready' });

    onCleanup(() => window.removeEventListener('message', handleMessage));
  });

  const moveSource = (sourceId: string, offset: number) => {
    const current = sources();
    const fromIndex = current.findIndex((source) => source.sourceId === sourceId);
    const toIndex = fromIndex + offset;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) {
      return;
    }

    const next = current.slice();
    const movedSource = next.splice(fromIndex, 1)[0];

    if (!movedSource) {
      return;
    }

    next.splice(toIndex, 0, movedSource);
    setSources(next);
  };

  const moveSourceTo = (sourceId: string, targetId: string) => {
    const current = sources();
    const fromIndex = current.findIndex((source) => source.sourceId === sourceId);
    const targetIndex = current.findIndex((source) => source.sourceId === targetId);

    if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) {
      return;
    }

    const next = current.slice();
    const movedSource = next.splice(fromIndex, 1)[0];

    if (!movedSource) {
      return;
    }

    next.splice(fromIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, movedSource);
    setSources(next);
  };

  const startDragging = (event: DragEvent, sourceId: string) => {
    setDraggedSourceId(sourceId);
    event.dataTransfer?.setData('text/plain', sourceId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (event: DragEvent, sourceId: string) => {
    event.preventDefault();
    setDropTargetId(sourceId);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const sourceId = draggedSourceId() || event.dataTransfer?.getData('text/plain') || '';
    moveSourceTo(sourceId, targetId);
    setDraggedSourceId('');
    setDropTargetId('');
  };

  const clearDragState = () => {
    setDraggedSourceId('');
    setDropTargetId('');
  };

  const removeSource = (sourceId: string) => {
    setSources((current) => current.filter((source) => source.sourceId !== sourceId));
    setPreviewErrors((current) => {
      const next = new Set(current);
      next.delete(sourceId);
      return next;
    });
  };

  const apply = () => {
    if (sources().length < 2) {
      return;
    }

    if (previewErrors().size > 0) {
      setHostError(labels().previewRenderError);
      return;
    }

    /* oxlint-disable unicorn/require-post-message-target-origin */
    vscode.postMessage({
      type: 'apply',
      payload: { sourceIds: sources().map((source) => source.sourceId) },
    });
    /* oxlint-enable unicorn/require-post-message-target-origin */
  };

  return (
    <main class='app'>
      <header class='app__header'>
        <h1>{labels().title}</h1>
        <p>{labels().description}</p>
      </header>

      <div class='workspace'>
        <section
          class='panel source-panel'
          aria-labelledby='source-list-title'
        >
          <div class='panel__header'>
            <div>
              <h2 id='source-list-title'>{labels().sourceList}</h2>
              <p>{labels().sourceListDescription}</p>
            </div>
            <span class='source-count'>{sources().length}</span>
          </div>

          <Show when={hostError()}>
            <p
              class='panel__error'
              role='alert'
            >
              {hostError()}
            </p>
          </Show>

          <div class='source-grid'>
            <For each={sources()}>
              {(source, index) => (
                <SourceCard
                  source={source}
                  index={index}
                  sourceCount={sources().length}
                  labels={labels()}
                  options={pdfOptions()}
                  dropTargetId={dropTargetId()}
                  onMove={moveSource}
                  onDragStart={startDragging}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={clearDragState}
                  onRemove={removeSource}
                  onPreviewError={() => setPreviewErrors((current) => new Set(current).add(source.sourceId))}
                />
              )}
            </For>
          </div>
        </section>

        <aside
          class='panel action-panel'
          aria-labelledby='actions-title'
        >
          <h2 id='actions-title'>{labels().actions}</h2>
          <p class='action-panel__count'>
            {sources().length} {labels().sourceCount}
          </p>
          <p class='action-panel__hint'>{labels().preview}</p>
          <div class='actions'>
            <button
              class='button button--primary'
              type='button'
              disabled={sources().length < 2}
              onClick={apply}
            >
              {labels().apply}
            </button>
            <button
              class='button'
              type='button'
              onClick={cancel}
            >
              {labels().cancel}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function cancel() {
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  vscode.postMessage({ type: 'cancel' });
}
