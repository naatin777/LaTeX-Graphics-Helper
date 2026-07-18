import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const webviewRoot = dirname(fileURLToPath(import.meta.url));

export interface WebviewTestConfig {
  appName: string;
}

export function defineWebviewTestConfig(config: WebviewTestConfig) {
  return defineConfig({
    root: resolve(webviewRoot, 'apps', config.appName),
    plugins: [solid()],
    resolve: {
      alias: {
        '@webview-shared': resolve(webviewRoot, 'shared'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      clearMocks: true,
      restoreMocks: true,
    },
  });
}
