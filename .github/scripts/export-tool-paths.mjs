import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function resolveTool(name) {
    try {
        if (process.platform === 'win32') {
            const output = execSync(`where ${name}`, { encoding: 'utf8' }).trim();
            return output.split(/\r?\n/)[0] ?? '';
        }

        return execSync(`command -v ${name}`, { encoding: 'utf8', shell: '/bin/bash' }).trim();
    } catch {
        return '';
    }
}

const gsName = process.platform === 'win32' ? 'gswin64c' : 'gs';
const gs = resolveTool(gsName);

const tools = {
    pdfcrop: resolveTool('pdfcrop'),
    pdftocairo: resolveTool('pdftocairo'),
    rsvgConvert: resolveTool('rsvg-convert'),
};

if (!tools.pdfcrop || !tools.pdftocairo || !tools.rsvgConvert || !gs) {
    console.error('Missing tools:', { ...tools, [gsName]: gs });
    process.exit(1);
}

if (process.env.GITHUB_ENV) {
    fs.appendFileSync(
        process.env.GITHUB_ENV,
        [
            `LGH_PDFCROP=${tools.pdfcrop}`,
            `LGH_PDFTOCAIRO=${tools.pdftocairo}`,
            `LGH_RSVG_CONVERT=${tools.rsvgConvert}`,
        ].join('\n') + '\n',
    );
}

if (process.env.GITHUB_PATH) {
    fs.appendFileSync(process.env.GITHUB_PATH, `${path.dirname(gs)}\n`);
}

fs.mkdirSync('.vscode-test', { recursive: true });
fs.writeFileSync('.vscode-test/ci-tool-paths.json', JSON.stringify(tools));

console.log(`pdfcrop=${tools.pdfcrop}`);
console.log(`pdftocairo=${tools.pdftocairo}`);
console.log(`rsvg-convert=${tools.rsvgConvert}`);
console.log(`${gsName}=${gs}`);
