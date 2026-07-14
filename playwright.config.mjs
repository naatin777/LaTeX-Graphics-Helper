import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: path.join(rootDir, 'test/playwright'),
    testMatch: '**/*.spec.ts',
    timeout: 120_000,
    expect: {
        timeout: 30_000,
    },
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    projects: [
        {
            name: 'webview-browser',
            testMatch: '**/*.spec.ts',
            testIgnore: '**/electron/**/*.spec.ts',
        },
        {
            name: 'vscode-electron',
            testMatch: '**/electron/**/*.spec.ts',
        },
    ],
    use: {
        trace: 'retain-on-failure',
    },
});
