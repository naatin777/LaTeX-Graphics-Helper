import { render } from 'solid-js/web';

import type { ExtensionToWebviewMessage, MergePdfLabels } from './messages';
import { App } from './app';

const postMessage = vi.hoisted(() => vi.fn<(message: unknown) => void>());
const renderFirstPdfPage = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>());

vi.mock('./vscode', () => ({
  vscode: { postMessage },
}));
vi.mock('@webview-shared/pdf/render_pdf_pages', () => ({ renderFirstPdfPage }));

const labels: MergePdfLabels = {
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

const initMessage: ExtensionToWebviewMessage = {
  type: 'init',
  payload: {
    sources: [
      { sourceId: 'source-1', fileName: 'one.pdf', pdfSrc: 'vscode-resource://one.pdf' },
      { sourceId: 'source-2', fileName: 'two.pdf', pdfSrc: 'vscode-resource://two.pdf' },
      { sourceId: 'source-3', fileName: 'three.pdf', pdfSrc: 'vscode-resource://three.pdf' },
    ],
    labels,
  },
};

describe('Merge PDF Webview', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    postMessage.mockReset();
    renderFirstPdfPage.mockResolvedValue(undefined);
    const root = document.querySelector('#root');

    if (!root) {
      throw new Error('Test root was not created.');
    }

    dispose = render(() => <App />, root);
    window.dispatchEvent(new MessageEvent('message', { data: initMessage }));
  });

  afterEach(() => {
    dispose?.();
    document.body.innerHTML = '';
  });

  test('reorders files with drag and drop and sends the displayed order', () => {
    const cards = document.querySelectorAll<HTMLElement>('.source-card');
    const firstHandle = cards[0]?.querySelector<HTMLButtonElement>('.button--handle');
    const targetCard = cards[2];

    if (!firstHandle || !targetCard) {
      throw new Error('Merge source cards were not rendered.');
    }

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      getData: () => 'source-1',
      setData: vi.fn<() => void>(),
    } as unknown as DataTransfer;
    dispatchDragEvent(firstHandle, 'dragstart', dataTransfer);
    dispatchDragEvent(targetCard, 'dragover', dataTransfer);
    dispatchDragEvent(targetCard, 'drop', dataTransfer);

    expect(sourceNames()).toEqual(['two.pdf', 'one.pdf', 'three.pdf']);

    document.querySelector<HTMLButtonElement>('button[aria-label="Remove from list: three.pdf"]')?.click();
    document.querySelector<HTMLButtonElement>('button.button--primary')?.click();

    expect(postMessage).toHaveBeenLastCalledWith({
      type: 'apply',
      payload: { sourceIds: ['source-2', 'source-1'] },
    });
  });
});

function sourceNames(): string[] {
  return [...document.querySelectorAll('.source-card h3')].map((heading) => heading.textContent ?? '');
}

function dispatchDragEvent(target: Element, type: string, dataTransfer: DataTransfer): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  target.dispatchEvent(event);
}
