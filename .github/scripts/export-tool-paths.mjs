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

function toolBinDirs(...tools) {
    return [
        ...new Set(
            tools
                .filter(Boolean)
                .map((toolPath) => path.dirname(toolPath))
                .filter((directory) => directory.length > 0 && directory !== '.'),
        ),
    ];
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

const pathExtra = toolBinDirs(tools.pdfcrop, tools.pdftocairo, tools.rsvgConvert, gs);

if (process.env.GITHUB_ENV) {
    fs.appendFileSync(
        process.env.GITHUB_ENV,
        [
            `LGH_PDFCROP=${tools.pdfcrop}`,
            `LGH_PDFTOCAIRO=${tools.pdftocairo}`,
            `LGH_RSVG_CONVERT=${tools.rsvgConvert}`,
            `LGH_PATH_EXTRA=${pathExtra.join(path.delimiter)}`,
        ].join('\n') + '\n',
    );
}

for (const directory of pathExtra) {
    if (process.env.GITHUB_PATH) {
        fs.appendFileSync(process.env.GITHUB_PATH, `${directory}\n`);
    }
}

fs.mkdirSync('.vscode-test', { recursive: true });
fs.writeFileSync(
    '.vscode-test/ci-tool-paths.json',
    JSON.stringify({ ...tools, pathExtra }),
);

console.log(`pdfcrop=${tools.pdfcrop}`);
console.log(`pdftocairo=${tools.pdftocairo}`);
console.log(`rsvg-convert=${tools.rsvgConvert}`);
console.log(`${gsName}=${gs}`);
console.log(`pathExtra=${pathExtra.join(path.delimiter)}`);
