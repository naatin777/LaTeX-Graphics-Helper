export function formatOutputPage(page: number, totalPages: number): string {
  const width = Math.max(1, String(totalPages).length);
  return String(page).padStart(width, '0');
}

export function assertPageTemplateForSplitOutput(template: string, totalPages: number): void {
  if (totalPages > 1 && !template.includes('${page}')) {
    throw new Error('Split output for multiple pages or frames requires ${page} in the output path.');
  }
}
