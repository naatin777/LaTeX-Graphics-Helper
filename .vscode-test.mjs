import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@vscode/test-cli';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceFolder = path.join(os.tmpdir(), 'latex-graphics-helper-vscode-test-workspace');
const fixturesSource = path.join(__dirname, 'src/test/fixtures/workspace');

const copyDirectory = (source, destination) => {
	fs.mkdirSync(destination, { recursive: true });
	for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
		const sourcePath = path.join(source, entry.name);
		const destinationPath = path.join(destination, entry.name);
		if (entry.isDirectory()) {
			copyDirectory(sourcePath, destinationPath);
		} else {
			fs.copyFileSync(sourcePath, destinationPath);
		}
	}
};

fs.rmSync(workspaceFolder, { recursive: true, force: true });
fs.mkdirSync(workspaceFolder, { recursive: true });
if (fs.existsSync(fixturesSource)) {
	copyDirectory(fixturesSource, workspaceFolder);
}

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder,
	mocha: {
		timeout: 60000,
		parallel: false,
	},
});
