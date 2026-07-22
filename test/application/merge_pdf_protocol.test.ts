import assert from 'node:assert/strict';

import {
  isMergePdfHostToWebviewMessage,
  isMergePdfWebviewToHostMessage,
} from '../../src/application/protocols/merge_pdf_protocol.js';

suite('Merge PDF Webview protocol', () => {
  test('accepts the init and apply message shapes', () => {
    assert.equal(
      isMergePdfHostToWebviewMessage({
        type: 'init',
        payload: {
          sources: [
            { sourceId: 'source-1', fileName: 'first.pdf', pdfSrc: 'vscode-resource://first.pdf' },
            { sourceId: 'source-2', fileName: 'second.pdf', pdfSrc: 'vscode-resource://second.pdf' },
          ],
          workerSrc: 'vscode-resource://pdf.worker.mjs',
          cMapUrl: 'vscode-resource://cmaps/',
          standardFontDataUrl: 'vscode-resource://standard_fonts/',
          wasmUrl: 'vscode-resource://wasm/',
          labels: {
            title: 'Merge PDFs',
            description: 'Arrange files.',
            sourceList: 'PDF files',
            sourceListDescription: 'Drag files.',
            sourceCount: 'files selected',
            actions: 'Actions',
            dragHandle: 'Drag to reorder',
            moveUp: 'Move up',
            moveDown: 'Move down',
            removeSource: 'Remove from list',
            preview: 'Preview',
            previewAriaLabel: 'First page preview',
            previewLoading: 'Loading',
            previewRenderError: 'Unavailable',
            apply: 'Merge',
            cancel: 'Cancel',
          },
        },
      }),
      true,
    );
    assert.equal(
      isMergePdfWebviewToHostMessage({
        type: 'apply',
        payload: { sourceIds: ['source-2', 'source-1'] },
      }),
      true,
    );
  });

  test('rejects filesystem paths and unsupported payload fields', () => {
    assert.equal(
      isMergePdfHostToWebviewMessage({
        type: 'init',
        payload: {
          sources: [
            { sourceId: 'source-1', fileName: 'first.pdf', pdfSrc: '/workspace/first.pdf' },
            { sourceId: 'source-2', fileName: 'second.pdf', pdfSrc: 'vscode-resource://second.pdf' },
          ],
          labels: {
            title: 'Merge PDFs',
            description: 'Arrange files.',
            sourceList: 'PDF files',
            sourceListDescription: 'Drag files.',
            sourceCount: 'files selected',
            actions: 'Actions',
            dragHandle: 'Drag to reorder',
            moveUp: 'Move up',
            moveDown: 'Move down',
            removeSource: 'Remove from list',
            preview: 'Preview',
            previewAriaLabel: 'First page preview',
            previewLoading: 'Loading',
            previewRenderError: 'Unavailable',
            apply: 'Merge',
            cancel: 'Cancel',
          },
        },
      }),
      false,
    );
    assert.equal(
      isMergePdfWebviewToHostMessage({
        type: 'apply',
        payload: { sourceIds: ['source-1', 'source-2'], paths: ['/workspace/first.pdf'] },
      }),
      false,
    );
  });
});
