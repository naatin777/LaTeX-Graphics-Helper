import type { MergePdfLabels } from './messages';

export const defaultLabels: MergePdfLabels = {
  title: 'Merge PDFs',
  description: 'Arrange the PDF files, then merge them in the displayed order.',
  sourceList: 'PDF files',
  sourceListDescription: 'Drag files to change their order.',
  sourceCount: 'files selected',
  actions: 'Actions',
  dragHandle: 'Drag to reorder',
  moveUp: 'Move up',
  moveDown: 'Move down',
  removeSource: 'Remove from list',
  preview: 'Preview',
  previewAriaLabel: 'First page preview',
  previewLoading: 'Loading preview...',
  previewRenderError: 'Preview unavailable',
  apply: 'Merge',
  cancel: 'Cancel',
};
