import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { _electron, test as base } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

export { expect } from '@playwright/test';

const extensionRoot = path.resolve(__dirname, '../../..');
const fixturesSource = path.join(extensionRoot, 'src/test/fixtures/workspace');

type VsCodeFixtures = {
    electronApp: ElectronApplication;
    page: Page;
};

const copyDirectory = (source: string, destination: string): void => {
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

export const test = base.extend<VsCodeFixtures>({
    electronApp: async (_fixtures, use) => {
        const workspaceFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'lgh-pw-workspace-'));
        if (fs.existsSync(fixturesSource)) {
            copyDirectory(fixturesSource, workspaceFolder);
        }

        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgh-pw-userdata-'));
        const extensionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgh-pw-extensions-'));
        const vscodePath = await downloadAndUnzipVSCode('stable');
        const electronApp = await _electron.launch({
            executablePath: vscodePath,
            env: { ...process.env, NODE_ENV: 'development' },
            args: [
                '--no-sandbox',
                '--disable-gpu-sandbox',
                '--disable-updates',
                '--new-window',
                '--skip-welcome',
                '--skip-release-notes',
                '--disable-workspace-trust',
                '--disable-telemetry',
                `--extensions-dir=${extensionsDir}`,
                `--user-data-dir=${userDataDir}`,
                `--extensionDevelopmentPath=${extensionRoot}`,
                workspaceFolder,
            ],
        });

        await use(electronApp);
        await electronApp.close();
    },
    page: async ({ electronApp }, use) => {
        const page = await electronApp.firstWindow();
        await page.waitForLoadState('domcontentloaded');
        await use(page);
    },
});
