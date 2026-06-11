import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { defineConfig } from '@vscode/test-cli';

const workspaceFolder = path.join(os.tmpdir(), 'latex-graphics-helper-vscode-test-workspace');
fs.mkdirSync(workspaceFolder, { recursive: true });

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder,
	mocha: {
		timeout: 20000,
	},
});
