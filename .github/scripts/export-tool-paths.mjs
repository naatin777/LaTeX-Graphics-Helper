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
    gs,
};

if (!tools.pdfcrop || !tools.pdftocairo || !tools.rsvgConvert || !gs) {
    console.error('Missing tools:', { ...tools });
    process.exit(1);
}

for (const toolPath of Object.values(tools)) {
    const directory = path.dirname(toolPath);
    if (process.env.GITHUB_PATH && directory.length > 0 && directory !== '.') {
        fs.appendFileSync(process.env.GITHUB_PATH, `${directory}\n`);
    }
}

fs.mkdirSync('.vscode-test', { recursive: true });
fs.writeFileSync('.vscode-test/ci-tool-paths.json', JSON.stringify(tools));

console.log(`pdfcrop=${tools.pdfcrop}`);
console.log(`pdftocairo=${tools.pdftocairo}`);
console.log(`rsvg-convert=${tools.rsvgConvert}`);
console.log(`${gsName}=${gs}`);
