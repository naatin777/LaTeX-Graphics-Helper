const LATEX_TEXT_SPECIALS = /[\\{}$&#%_^~]/g;
const LATEX_TEXT_ESCAPES: Readonly<Record<string, string>> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}',
};

export function escapeLatex(value: string): string {
  return value.replace(LATEX_TEXT_SPECIALS, (character) => LATEX_TEXT_ESCAPES[character] ?? character);
}

export function escapeLatexLabel(value: string): string {
  return value.replace(/[\\/\s{}$&#%_^~]+/g, '-');
}
