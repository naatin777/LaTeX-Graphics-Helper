import type * as vscode from 'vscode';

export interface TemplateContext {
  path: string;
  name: string;
  ext: string;
  page?: number;
  dir: string;
}

const DEFAULT_PDF_TEMPLATE = [
  '\\begin{figure}[H]',
  '  \\centering',
  '  \\includegraphics[width=\\linewidth]{${path}}',
  '  \\caption{${name}}',
  '  \\label{fig:${name}}',
  '\\end{figure}',
].join('\n');

const DEFAULT_IMAGE_TEMPLATE = [
  '\\begin{figure}[H]',
  '  \\centering',
  '  \\resizebox{\\linewidth}{!}{\\includegraphics{${path}}}',
  '  \\caption{${name}}',
  '  \\label{fig:${name}}',
  '\\end{figure}',
].join('\n');

export function renderTemplate(template: string, context: TemplateContext): string {
  return template
    .replaceAll('${path}', context.path)
    .replaceAll('${name}', context.name)
    .replaceAll('${ext}', context.ext)
    .replaceAll('${page}', context.page !== undefined ? String(context.page) : '1')
    .replaceAll('${dir}', context.dir);
}

export function getPdfTemplate(configuration: vscode.WorkspaceConfiguration): string {
  return configuration.get<string>('insertLatex.pdfTemplate') || DEFAULT_PDF_TEMPLATE;
}

export function getImageTemplate(configuration: vscode.WorkspaceConfiguration): string {
  return configuration.get<string>('insertLatex.imageTemplate') || DEFAULT_IMAGE_TEMPLATE;
}
