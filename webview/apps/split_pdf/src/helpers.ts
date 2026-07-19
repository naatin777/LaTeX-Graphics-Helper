import type { SplitPdfLabels } from '@lgh-split-pdf-protocol';

import type { PageParseFailure } from './pages';

export function formatLabel(template: string, value: string): string {
  return template.replace('{0}', value);
}

export function pageFailureMessage(failure: PageParseFailure, labels: SplitPdfLabels): string {
  if (failure.kind === 'required') {
    return labels.pagesRequiredError;
  }

  if (failure.kind === 'wholeNumber' || failure.kind === 'malformed') {
    return failure.kind === 'wholeNumber'
      ? formatLabel(labels.pageWholeNumberError, failure.token)
      : formatLabel(labels.invalidPages, failure.token);
  }

  if (failure.kind === 'descending') {
    return formatLabel(labels.descendingPages, failure.token);
  }

  return formatLabel(labels.pageOutOfRangeError, failure.token);
}
