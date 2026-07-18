export interface SplitPdfLabels {
  title: string;
  description: string;
  preview: string;
  previewDescription: string;
  previewAriaLabel: string;
  groups: string;
  pages: string;
  pagesPlaceholder: string;
  outputName: string;
  outputNamePlaceholder: string;
  outputPath: string;
  addGroup: string;
  removeGroup: string;
  apply: string;
  cancel: string;
  previewRenderError: string;
  previewApplyError: string;
  pagesRequiredError: string;
  pageWholeNumberError: string;
  pageOutOfRangeError: string;
  allPages: string;
  focusedPages: string;
  zoom: string;
  dragGroup: string;
  moveUp: string;
  moveDown: string;
  outputOrder: string;
  invalidPages: string;
  descendingPages: string;
  outputNameEmpty: string;
  outputNamePath: string;
  outputNameDuplicate: string;
}

export type SplitPdfHostToWebview =
  | {
      type: 'init';
      payload: {
        sourceId: string;
        fileName: string;
        pageCount: number;
        pdfSrc: string;
        outputPathTemplate: string;
        workerSrc?: string;
        cMapUrl?: string;
        standardFontDataUrl?: string;
        wasmUrl?: string;
        labels: SplitPdfLabels;
      };
    }
  | {
      type: 'error';
      payload: { message: string };
    };

export interface SplitPdfPageGroupRow {
  pages: number[];
  outputName: string;
}

export type SplitPdfPageParseFailureKind = 'required' | 'malformed' | 'wholeNumber' | 'descending' | 'outOfRange';

export type SplitPdfPageParseFailure = {
  ok: false;
  kind: SplitPdfPageParseFailureKind;
  token: string;
};

export type SplitPdfPageParseResult = { ok: true; pages: number[] } | SplitPdfPageParseFailure;

export function parseSplitPdfPages(raw: string, pageCount: number): SplitPdfPageParseResult {
  if (raw.trim().length === 0) {
    return { ok: false, kind: 'required', token: raw };
  }

  const pages: number[] = [];

  for (const rawToken of raw.split(',')) {
    const token = rawToken.trim();

    if (token.length === 0) {
      return { ok: false, kind: 'malformed', token: rawToken };
    }

    if (/^\d+$/.test(token)) {
      const page = Number(token);

      if (!Number.isSafeInteger(page)) {
        return { ok: false, kind: 'wholeNumber', token };
      }

      if (page < 1 || page > pageCount) {
        return { ok: false, kind: 'outOfRange', token };
      }

      pages.push(page);
      continue;
    }

    const range = /^(\d+)\s*-\s*(\d*)$/.exec(token) ?? /^-\s*(\d+)$/.exec(token);

    if (!range) {
      return { ok: false, kind: token.includes('.') ? 'wholeNumber' : 'malformed', token };
    }

    const isLeadingOpenRange = token.startsWith('-');
    const start = Number(isLeadingOpenRange ? '1' : range[1]);
    const end = Number(isLeadingOpenRange ? range[1] : range[2] || pageCount.toString());

    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      return { ok: false, kind: 'wholeNumber', token };
    }

    if (end < start) {
      return { ok: false, kind: 'descending', token };
    }

    if (start < 1 || end > pageCount) {
      return { ok: false, kind: 'outOfRange', token };
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
  }

  return { ok: true, pages };
}

export type SplitPdfWebviewToHost =
  | { type: 'ready' }
  | {
      type: 'apply';
      payload: { rows: SplitPdfPageGroupRow[] };
    }
  | { type: 'cancel' }
  | {
      type: 'previewLoadFailed';
      payload: { message: string };
    };

export function isSplitPdfHostToWebviewMessage(value: unknown): value is SplitPdfHostToWebview {
  if (!isRecord(value) || typeof value.type !== 'string' || !isRecord(value.payload)) {
    return false;
  }

  if (value.type === 'error') {
    return (
      hasExactKeys(value, ['type', 'payload']) &&
      hasExactKeys(value.payload, ['message']) &&
      isString(value.payload.message)
    );
  }

  if (value.type !== 'init') {
    return false;
  }

  return (
    hasExactKeys(value, ['type', 'payload']) &&
    hasExactKeys(
      value.payload,
      ['sourceId', 'fileName', 'pageCount', 'pdfSrc', 'outputPathTemplate', 'labels'],
      ['workerSrc', 'cMapUrl', 'standardFontDataUrl', 'wasmUrl'],
    ) &&
    isNonEmptyString(value.payload.sourceId) &&
    isNonEmptyString(value.payload.fileName) &&
    isPositiveInteger(value.payload.pageCount) &&
    isWebviewUri(value.payload.pdfSrc) &&
    isNonEmptyString(value.payload.outputPathTemplate) &&
    isOptionalWebviewUri(value.payload.workerSrc) &&
    isOptionalWebviewUri(value.payload.cMapUrl) &&
    isOptionalWebviewUri(value.payload.standardFontDataUrl) &&
    isOptionalWebviewUri(value.payload.wasmUrl) &&
    isSplitPdfLabels(value.payload.labels)
  );
}

export function isSplitPdfWebviewToHostMessage(value: unknown): value is SplitPdfWebviewToHost {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (value.type === 'ready' || value.type === 'cancel') {
    return hasExactKeys(value, ['type']);
  }

  if (value.type === 'previewLoadFailed') {
    return (
      hasExactKeys(value, ['type', 'payload']) &&
      isRecord(value.payload) &&
      hasExactKeys(value.payload, ['message']) &&
      isString(value.payload.message)
    );
  }

  if (value.type !== 'apply' || !hasExactKeys(value, ['type', 'payload']) || !isRecord(value.payload)) {
    return false;
  }

  return (
    hasExactKeys(value.payload, ['rows']) &&
    Array.isArray(value.payload.rows) &&
    value.payload.rows.length > 0 &&
    value.payload.rows.every(isSplitPdfPageGroupRow)
  );
}

function isSplitPdfLabels(value: unknown): value is SplitPdfLabels {
  if (!isRecord(value)) {
    return false;
  }

  const labelKeys: readonly string[] = [
    'title',
    'description',
    'preview',
    'previewDescription',
    'previewAriaLabel',
    'groups',
    'pages',
    'pagesPlaceholder',
    'outputName',
    'outputNamePlaceholder',
    'outputPath',
    'addGroup',
    'removeGroup',
    'apply',
    'cancel',
    'previewRenderError',
    'previewApplyError',
    'pagesRequiredError',
    'pageWholeNumberError',
    'pageOutOfRangeError',
    'allPages',
    'focusedPages',
    'zoom',
    'dragGroup',
    'moveUp',
    'moveDown',
    'outputOrder',
    'invalidPages',
    'descendingPages',
    'outputNameEmpty',
    'outputNamePath',
    'outputNameDuplicate',
  ];

  return hasExactKeys(value, labelKeys) && labelKeys.every((key) => isString(value[key]));
}

function isSplitPdfPageGroupRow(value: unknown): value is SplitPdfPageGroupRow {
  if (!isRecord(value) || !hasExactKeys(value, ['pages', 'outputName'])) {
    return false;
  }

  return (
    Array.isArray(value.pages) &&
    value.pages.length > 0 &&
    value.pages.every(isPositiveInteger) &&
    isNonEmptyString(value.outputName)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): boolean {
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(value);

  return requiredKeys.every((key) => key in value) && keys.every((key) => allowedKeys.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

function isOptionalWebviewUri(value: unknown): value is string | undefined {
  return value === undefined || isWebviewUri(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isWebviewUri(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const protocol = new URL(value).protocol;
    return protocol === 'vscode-resource:' || protocol === 'vscode-webview-resource:' || protocol === 'https:';
  } catch {
    return false;
  }
}
