import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: path.join(rootDir, 'test/playwright'),
    testMatch: '**/*.spec.ts',
    outputDir: path.join(rootDir, 'test-results'),
    timeout: 120_000,
    expect: {
        timeout: 30_000,
    },
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    forbidOnly: !!process.env.CI,
    reporter: process.env.CI
        ? [
              ['github'],
              ['list'],
              ['html', { outputFolder: 'playwright-report', open: 'never' }],
          ]
        : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    projects: [
        {
            name: 'vscode-electron',
            testMatch: '**/electron/**/*.spec.ts',
        },
    ],
    use: {
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
});
