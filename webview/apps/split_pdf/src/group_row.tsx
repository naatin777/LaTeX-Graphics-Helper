import type { Accessor } from 'solid-js';

import type { SplitPdfLabels } from '@lgh-split-pdf-protocol';

import type { InputKind, Row } from './types';

export function GroupRow(props: {
  row: Row;
  index: Accessor<number>;
  rowCount: number;
  labels: SplitPdfLabels;
  outputPathTemplate: string;
  focused: boolean;
  setInputRef: (rowId: number, kind: InputKind, element: HTMLInputElement) => void;
  onFocus: (rowId: number) => void;
  onPagesChange: (rowId: number, pages: string) => void;
  onOutputNameChange: (rowId: number, outputName: string) => void;
  onKeyDown: (event: KeyboardEvent, rowIndex: number, kind: InputKind) => void;
  onMove: (rowId: number, direction: -1 | 1) => void;
  onRemove: (rowId: number) => void;
  onDragStart: (event: DragEvent, rowId: number) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent, rowId: number) => void;
}) {
  return (
    <article
      class='group-row'
      class:group-row--focused={props.focused}
      onDragOver={props.onDragOver}
      onDrop={(event) => props.onDrop(event, props.row.id)}
    >
      <div class='group-row__header'>
        <span class='group-row__number'>{props.index() + 1}</span>
        <button
          aria-label={`${props.labels.dragGroup} ${props.index() + 1}`}
          class='drag-handle'
          draggable='true'
          type='button'
          onDragEnd={props.onDragEnd}
          onDragStart={(event) => props.onDragStart(event, props.row.id)}
        >
          ::
        </button>
        <div class='group-row__actions'>
          <button
            aria-label={`${props.labels.moveUp} ${props.index() + 1}`}
            class='button button--small'
            disabled={props.index() === 0}
            type='button'
            onClick={() => props.onMove(props.row.id, -1)}
          >
            {props.labels.moveUp}
          </button>
          <button
            aria-label={`${props.labels.moveDown} ${props.index() + 1}`}
            class='button button--small'
            disabled={props.index() === props.rowCount - 1}
            type='button'
            onClick={() => props.onMove(props.row.id, 1)}
          >
            {props.labels.moveDown}
          </button>
          <button
            aria-label={`${props.labels.removeGroup} ${props.index() + 1}`}
            class='button button--small'
            type='button'
            onClick={() => props.onRemove(props.row.id)}
          >
            {props.labels.removeGroup}
          </button>
        </div>
      </div>

      <div class='group-row__fields'>
        <label class='field'>
          <span class='field__label'>{props.labels.pages}</span>
          <input
            ref={(element) => props.setInputRef(props.row.id, 'pages', element)}
            aria-label={`${props.labels.pages} ${props.index() + 1}`}
            class='input'
            placeholder={props.labels.pagesPlaceholder}
            type='text'
            value={props.row.pages}
            onFocus={() => props.onFocus(props.row.id)}
            onInput={(event) => props.onPagesChange(props.row.id, event.currentTarget.value)}
            onKeyDown={(event) => props.onKeyDown(event, props.index(), 'pages')}
          />
        </label>
        <label class='field'>
          <span class='field__label'>{props.labels.outputName}</span>
          <input
            ref={(element) => props.setInputRef(props.row.id, 'outputName', element)}
            aria-label={`${props.labels.outputName} ${props.index() + 1}`}
            class='input'
            placeholder={props.labels.outputNamePlaceholder}
            type='text'
            value={props.row.outputName}
            onFocus={() => props.onFocus(props.row.id)}
            onInput={(event) => props.onOutputNameChange(props.row.id, event.currentTarget.value)}
            onKeyDown={(event) => props.onKeyDown(event, props.index(), 'outputName')}
          />
        </label>
      </div>
      <p class='group-row__output-path'>
        <span>{props.labels.outputPath}:</span>{' '}
        {props.outputPathTemplate.split('__LGH_OUTPUT_NAME__').join(props.row.outputName)}
      </p>
    </article>
  );
}
