export function escapeLatex(text: string): string {
    return text
        .replace(/\\/g, '\\textbackslash ')
        .replace(/%/g, '\\%')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/&/g, '\\&')
        .replace(/#/g, '\\#')
        .replace(/\$/g, '\\$')
        .replace(/\^/g, '\\textasciicircum ')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/_/g, '\\_')
        .replace(/\|/g, '\\textbar ')
        .replace(/</g, '\\textless ')
        .replace(/>/g, '\\textgreater ');
}

export function escapeLatexLabel(text: string): string {
    return text
        .replace(/\\/g, '')
        .replace(/%/g, '')
        .replace(/{/g, '')
        .replace(/}/g, '')
        .replace(/#/g, '');
}
