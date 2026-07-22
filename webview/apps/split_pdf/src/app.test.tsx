import { render } from 'solid-js/web';

import type { ExtensionToWebviewMessage, SplitPdfLabels } from './messages';
import { App } from './app';

const postMessage = vi.hoisted(() => vi.fn<(message: unknown) => void>());
const renderPdfPages = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>());

vi.mock('./vscode', () => ({
  vscode: { postMessage },
}));
vi.mock('@webview-shared/pdf/render_pdf_pages', () => ({ renderPdfPages }));

const labels: SplitPdfLabels = {
  title: 'Split PDF',
  description: 'Select pages and assign an output name to each group.',
  preview: 'Preview',
  previewDescription: 'Preview the selected pages.',
  previewAriaLabel: 'PDF preview',
  groups: 'Groups',
  pages: 'Pages',
  pagesPlaceholder: 'Example: 1, 3-6, 10-',
  outputName: 'Output name',
  outputNamePlaceholder: 'group-1',
  outputPath: 'Output path',
  addGroup: 'Add group',
  removeGroup: 'Remove group',
  apply: 'Apply',
  cancel: 'Cancel',
  previewRenderError: 'Could not display the PDF',
  previewApplyError: 'PDF preview must render before applying.',
  pagesRequiredError: 'At least one page must be selected.',
  pageWholeNumberError: 'Page must be a whole number: {0}',
  pageOutOfRangeError: 'Selected page is out of range: {0}',
  allPages: 'All pages',
  focusedPages: 'Focused',
  zoom: 'Preview zoom',
  dragGroup: 'Drag group',
  moveUp: 'Move up',
  moveDown: 'Move down',
  outputOrder: 'Output order',
  invalidPages: 'Invalid page expression: {0}',
  descendingPages: 'Page range must ascend: {0}',
  outputNameEmpty: 'Output name cannot be empty.',
  outputNamePath: 'Output name must not contain path separators or .. .',
  outputNameDuplicate: 'Output name is duplicated: {0}',
};

const initMessage: ExtensionToWebviewMessage = {
  type: 'init',
  payload: {
    sourceId: 'source-1',
    fileName: 'source.pdf',
    pageCount: 4,
    pdfSrc: 'vscode-resource://source.pdf',
    outputPathTemplate: 'output/__LGH_OUTPUT_NAME__.pdf',
    labels,
  },
};

describe('Split PDF Webview', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    postMessage.mockReset();
    renderPdfPages.mockResolvedValue({ firstPageReady: Promise.resolve(), dispose: vi.fn<() => void>() });
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

  test('shows page errors and adds a row on Enter after valid input', async () => {
    await flushPromises();

    const pages = findInput('Pages 1');
    setInput(pages, '3-1');
    await flushPromises();
    dispatchEnter(findInput('Pages 1'));
    await flushPromises();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Page range must ascend');

    setInput(findInput('Pages 1'), '1-2');
    await flushPromises();
    dispatchEnter(findInput('Pages 1'));
    await flushPromises();

    expect(document.querySelector('input[aria-label="Pages 2"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Pages 2"]'));
  });

  test('toggles all-page preview, changes zoom, and applies groups', async () => {
    await flushPromises();
    postMessage.mockClear();

    const pages = findInput('Pages 1');
    setInput(pages, '1-2');
    const allPagesButton = document.querySelectorAll<HTMLButtonElement>('.segmented__button')[1];
    allPagesButton?.click();
    expect(allPagesButton?.getAttribute('aria-pressed')).toBe('true');

    const zoom = document.querySelector<HTMLInputElement>('input[type="number"][aria-label="Preview zoom"]');
    if (!zoom) {
      throw new Error('Preview zoom input was not rendered.');
    }

    setInput(zoom, '200');
    expect(zoom.value).toBe('200');

    document.querySelector<HTMLButtonElement>('button.button--primary')?.click();
    expect(postMessage).toHaveBeenLastCalledWith({
      type: 'apply',
      payload: { rows: [{ pages: [1, 2], outputName: '1-2' }] },
    });
  });
});

function findInput(label: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);

  if (!input) {
    throw new Error(`${label} input was not rendered.`);
  }

  return input;
}

function setInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function dispatchEnter(input: HTMLInputElement): void {
  const event = new Event('keydown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'key', { value: 'Enter' });
  input.focus();
  input.dispatchEvent(event);
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
