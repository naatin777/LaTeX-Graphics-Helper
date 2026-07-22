import type { Accessor } from 'solid-js';

import type { MergePdfLabels, MergePdfSource } from './messages';
import { PreviewThumbnail, type PdfOptions } from './preview_thumbnail';

export function SourceCard(props: {
  source: MergePdfSource;
  index: Accessor<number>;
  sourceCount: number;
  labels: MergePdfLabels;
  options: PdfOptions;
  dropTargetId: string;
  onMove: (sourceId: string, offset: number) => void;
  onDragStart: (event: DragEvent, sourceId: string) => void;
  onDragOver: (event: DragEvent, sourceId: string) => void;
  onDrop: (event: DragEvent, sourceId: string) => void;
  onDragEnd: () => void;
  onRemove: (sourceId: string) => void;
  onPreviewError: () => void;
}) {
  return (
    <article
      class='source-card'
      classList={{ 'source-card--drop-target': props.dropTargetId === props.source.sourceId }}
      onDragOver={(event) => props.onDragOver(event, props.source.sourceId)}
      onDrop={(event) => props.onDrop(event, props.source.sourceId)}
    >
      <PreviewThumbnail
        source={props.source}
        options={props.options}
        labels={props.labels}
        onError={props.onPreviewError}
      />
      <div class='source-card__content'>
        <div class='source-card__header'>
          <span class='source-card__position'>{props.index() + 1}</span>
          <h3 title={props.source.fileName}>{props.source.fileName}</h3>
        </div>

        <div class='source-card__controls'>
          <button
            class='button button--handle'
            type='button'
            draggable={true}
            aria-label={props.labels.dragHandle}
            onDragStart={(event) => props.onDragStart(event, props.source.sourceId)}
            onDragEnd={props.onDragEnd}
          >
            ::
          </button>
          <button
            class='button'
            type='button'
            disabled={props.index() === 0}
            aria-label={props.labels.moveUp}
            onClick={() => props.onMove(props.source.sourceId, -1)}
          >
            {props.labels.moveUp}
          </button>
          <button
            class='button'
            type='button'
            disabled={props.index() === props.sourceCount - 1}
            aria-label={props.labels.moveDown}
            onClick={() => props.onMove(props.source.sourceId, 1)}
          >
            {props.labels.moveDown}
          </button>
          <button
            class='button button--danger'
            type='button'
            aria-label={`${props.labels.removeSource}: ${props.source.fileName}`}
            onClick={() => props.onRemove(props.source.sourceId)}
          >
            {props.labels.removeSource}
          </button>
        </div>
      </div>
    </article>
  );
}
