const LATEX_ESCAPES: Readonly<Record<string, string>> = {
    '\\': '\\textbackslash ',
    '%': '\\%',
    '{': '\\{',
    '}': '\\}',
    '&': '\\&',
    '#': '\\#',
    $: '\\$',
    '^': '\\textasciicircum ',
    '~': '\\textasciitilde ',
    _: '\\_',
    '|': '\\textbar ',
    '<': '\\textless ',
    '>': '\\textgreater ',
};

const LATEX_SPECIAL = /[\\%{}&#$^_~|<>]/g;

export function escapeLatex(text: string): string {
    return text.replace(LATEX_SPECIAL, (character) => LATEX_ESCAPES[character]);
}

const LATEX_LABEL_STRIP = /[\\%{}#]/g;

export function escapeLatexLabel(text: string): string {
    return text.replace(LATEX_LABEL_STRIP, '');
}
