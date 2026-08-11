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

const LATEX_SPECIAL_CHARACTERS = /[\\%{}&#$^~_|<>]/g;

export function escapeLatex(text: string): string {
    return text.replace(LATEX_SPECIAL_CHARACTERS, (character) => LATEX_ESCAPES[character]);
}

export function escapeLatexLabel(text: string): string {
    return text.replace(/[\\%{}#]/g, '');
}
