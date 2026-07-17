export function escapeLatex(value: string): string {
  return value.replaceAll('\\', '\\textbackslash{}').replaceAll('_', '\\_');
}

export function escapeLatexLabel(value: string): string {
  return value.replaceAll('\\', '-').replaceAll('/', '-').replaceAll(/\s+/g, '-');
}
