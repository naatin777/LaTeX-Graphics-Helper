export interface MergePdfSource {
  sourceId: string;
  fileName: string;
  pdfSrc: string;
}

export interface MergePdfLabels {
  title: string;
  description: string;
  sourceList: string;
  sourceListDescription: string;
  sourceCount: string;
  actions: string;
  dragHandle: string;
  moveUp: string;
  moveDown: string;
  removeSource: string;
  preview: string;
  previewAriaLabel: string;
  previewLoading: string;
  previewRenderError: string;
  apply: string;
  cancel: string;
}

export type MergePdfHostToWebview =
  | {
      type: 'init';
      payload: {
        sources: MergePdfSource[];
        workerSrc?: string;
        cMapUrl?: string;
        standardFontDataUrl?: string;
        wasmUrl?: string;
        labels: MergePdfLabels;
      };
    }
  | {
      type: 'error';
      payload: { message: string };
    };

export type MergePdfWebviewToHost =
  | { type: 'ready' }
  | {
      type: 'apply';
      payload: { sourceIds: string[] };
    }
  | { type: 'cancel' }
  | {
      type: 'previewLoadFailed';
      payload: { message: string };
    };

export function isMergePdfHostToWebviewMessage(value: unknown): value is MergePdfHostToWebview {
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
    hasExactKeys(value.payload, ['sources', 'labels'], ['workerSrc', 'cMapUrl', 'standardFontDataUrl', 'wasmUrl']) &&
    Array.isArray(value.payload.sources) &&
    value.payload.sources.length >= 2 &&
    value.payload.sources.every(isMergePdfSource) &&
    new Set(value.payload.sources.map((source) => source.sourceId)).size === value.payload.sources.length &&
    isOptionalWebviewUri(value.payload.workerSrc) &&
    isOptionalWebviewUri(value.payload.cMapUrl) &&
    isOptionalWebviewUri(value.payload.standardFontDataUrl) &&
    isOptionalWebviewUri(value.payload.wasmUrl) &&
    isMergePdfLabels(value.payload.labels)
  );
}

function isMergePdfLabels(value: unknown): value is MergePdfLabels {
  if (!isRecord(value)) {
    return false;
  }

  const labelKeys: readonly string[] = [
    'title',
    'description',
    'sourceList',
    'sourceListDescription',
    'sourceCount',
    'actions',
    'dragHandle',
    'moveUp',
    'moveDown',
    'removeSource',
    'preview',
    'previewAriaLabel',
    'previewLoading',
    'previewRenderError',
    'apply',
    'cancel',
  ];

  return hasExactKeys(value, labelKeys) && labelKeys.every((key) => isString(value[key]));
}

export function isMergePdfWebviewToHostMessage(value: unknown): value is MergePdfWebviewToHost {
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
    hasExactKeys(value.payload, ['sourceIds']) &&
    Array.isArray(value.payload.sourceIds) &&
    value.payload.sourceIds.length > 0 &&
    value.payload.sourceIds.every(isNonEmptyString)
  );
}

function isMergePdfSource(value: unknown): value is MergePdfSource {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['sourceId', 'fileName', 'pdfSrc']) &&
    isNonEmptyString(value.sourceId) &&
    isNonEmptyString(value.fileName) &&
    isWebviewUri(value.pdfSrc)
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
