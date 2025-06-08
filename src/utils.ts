import * as path from 'path';

export function toPosixPath(p: string): string {
    return path.normalize(p).split(/[\\\/]/g).join(path.posix.sep);
}

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

export function transpose<T>(a: T[][]): T[][] {
    return a[0].map((_, c) => a.map(r => r[c]));
}
