import type { SplitPdfLabels } from '@lgh-split-pdf-protocol';

import type { PreviewMode } from './types';

export function PreviewToolbar(props: {
  labels: SplitPdfLabels;
  previewMode: PreviewMode;
  zoomPercent: number;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onZoomChange: (value: number) => void;
}) {
  return (
    <div class='pdf-preview__toolbar'>
      <div>
        <h2>{props.labels.preview}</h2>
        <p>{props.labels.previewDescription}</p>
      </div>
      <div class='preview-tools'>
        <div
          aria-label={props.labels.preview}
          class='segmented'
          role='group'
        >
          <button
            aria-pressed={props.previewMode === 'focused'}
            class='segmented__button'
            class:segmented__button--active={props.previewMode === 'focused'}
            type='button'
            onClick={() => props.onPreviewModeChange('focused')}
          >
            {props.labels.focusedPages}
          </button>
          <button
            aria-pressed={props.previewMode === 'all'}
            class='segmented__button'
            class:segmented__button--active={props.previewMode === 'all'}
            type='button'
            onClick={() => props.onPreviewModeChange('all')}
          >
            {props.labels.allPages}
          </button>
        </div>
        <label class='zoom'>
          <span class='sr-only'>{props.labels.zoom}</span>
          <input
            aria-label={props.labels.zoom}
            max='400'
            min='25'
            step='5'
            type='range'
            value={props.zoomPercent}
            onInput={(event) => props.onZoomChange(Number(event.currentTarget.value))}
          />
          <span class='zoom__number'>
            <input
              aria-label={props.labels.zoom}
              max='400'
              min='25'
              step='5'
              type='number'
              value={props.zoomPercent}
              onInput={(event) => props.onZoomChange(Number(event.currentTarget.value))}
            />
            <span aria-hidden='true'>%</span>
          </span>
        </label>
      </div>
    </div>
  );
}
