import { defineConfig, type OxlintOverride } from 'oxlint';

const extensionOnly = [
  { name: 'solid-js', message: 'Solid is Webview frontend-only.' },
  { name: 'solid-js/web', message: 'Solid DOM rendering is Webview frontend-only.' },
  { name: 'pdfjs-dist', message: 'PDF.js belongs in Webview frontend.' },
  { name: 'vite', message: 'Vite belongs in Webview build config.' },
  { name: 'vite-plugin-solid', message: 'vite-plugin-solid belongs in Webview build config.' },
];

const browserOnly = [
  { name: 'vscode', message: 'Webview frontend must use the acquireVsCodeApi wrapper.' },
  { name: 'fs', message: 'Webview frontend must not import Node fs.' },
  { name: 'node:fs', message: 'Webview frontend must not import Node fs.' },
  { name: 'path', message: 'Webview frontend must not import Node path.' },
  { name: 'node:path', message: 'Webview frontend must not import Node path.' },
  { name: 'child_process', message: 'Webview frontend must not execute external processes.' },
  { name: 'node:child_process', message: 'Webview frontend must not execute external processes.' },
  { name: 'os', message: 'Webview frontend must not import Node os.' },
  { name: 'node:os', message: 'Webview frontend must not import Node os.' },
  { name: 'crypto', message: 'Use Web Crypto in Webview frontend.' },
  { name: 'node:crypto', message: 'Use Web Crypto in Webview frontend.' },
];

const corePaths = [{ name: 'vscode', message: 'Core code must not import the VS Code API.' }, ...extensionOnly];
const corePatterns = [
  { group: ['../commands/*', '../../commands/*'], message: 'Core code must not import command/UI code.' },
  { group: ['../webview/*', '../../webview/*'], message: 'Core code must not import Webview presentation code.' },
  {
    group: ['@webview-shared/*', '../../webview/*', '../../../webview/*'],
    message: 'Core code must not import Webview modules.',
  },
];

const frontendPatterns = [
  {
    group: ['../../src/*', '../../../src/*', '../../../../src/*'],
    message: 'Webview frontend must not import extension runtime modules.',
  },
];

const restrictedImports = (
  paths: { name: string; message: string }[],
  patterns: { group: string[]; message: string }[] = frontendPatterns,
): NonNullable<OxlintOverride['rules']> => ({
  'no-restricted-imports': ['error', { paths, patterns }],
});

const appOverrides: OxlintOverride[] = [
  {
    files: ['webview/apps/pdf-workbench/**/*.ts', 'webview/apps/pdf-workbench/**/*.tsx'],
    rules: restrictedImports(browserOnly, [
      ...frontendPatterns,
      { group: ['../pdf-arranger/*', '../../pdf-arranger/*'], message: 'pdf-workbench must not import pdf-arranger.' },
    ]),
  },
  {
    files: ['webview/apps/pdf-arranger/**/*.ts', 'webview/apps/pdf-arranger/**/*.tsx'],
    rules: restrictedImports(browserOnly, [
      ...frontendPatterns,
      {
        group: ['../pdf-workbench/*', '../../pdf-workbench/*'],
        message: 'pdf-arranger must not import pdf-workbench.',
      },
    ]),
  },
  {
    files: ['webview/apps/*/src/**/*.ts', 'webview/apps/*/src/**/*.tsx'],
    rules: restrictedImports(browserOnly, [
      ...frontendPatterns,
      { group: ['../*/src/*', '../../*/src/*'], message: 'Webview frontend must not import another app.' },
    ]),
  },
  {
    files: ['webview/shared/**/*.ts'],
    rules: restrictedImports(browserOnly, [
      { group: ['../apps/*', '../../apps/*'], message: 'webview/shared must not import app-specific modules.' },
      {
        group: ['../src/*', '../../src/*', '../../../src/*'],
        message: 'webview/shared must not import extension runtime.',
      },
    ]),
  },
];

export default defineConfig({
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'node', 'promise', 'vitest'],
  categories: { correctness: 'error', suspicious: 'warn', perf: 'warn' },
  options: { reportUnusedDisableDirectives: 'warn' },
  ignorePatterns: [
    'out/**',
    'dist/**',
    'coverage/**',
    'media/webview/**',
    'node_modules/**',
    '.vscode-test/**',
    '.playwright/**',
  ],
  rules: {
    curly: 'warn',
    eqeqeq: 'warn',
    'no-throw-literal': 'error',
    'no-console': 'warn',
    'no-await-in-loop': 'off',
    'no-unused-vars': 'off',
    'typescript/no-unused-vars': 'error',
    'typescript/consistent-type-imports': 'warn',
    'typescript/no-explicit-any': 'warn',
    'typescript/no-require-imports': 'error',
    'unicorn/prefer-node-protocol': 'error',
    'import/no-nodejs-modules': 'off',
    'node/no-process-env': 'off',
    'promise/always-return': 'off',
    'promise/catch-or-return': 'off',
  },
  overrides: [
    {
      files: ['src/application/**/*.ts', 'src/operations/**/*.ts', 'src/latex/**/*.ts', 'src/config/**/*.ts'],
      rules: restrictedImports(corePaths, corePatterns),
    },
    {
      files: ['src/commands/**/*.ts', 'src/webview/**/*.ts', 'src/extension.ts'],
      rules: restrictedImports(extensionOnly, [
        {
          group: ['../../webview/apps/*', '../../../webview/apps/*', '@webview-shared/*'],
          message: 'Extension runtime must not import Webview frontend.',
        },
      ]),
    },
    ...appOverrides,
    {
      files: ['webview/apps/crop_pdf/src/**/*.ts', 'webview/apps/crop_pdf/src/**/*.tsx'],
      rules: { 'unicorn/require-post-message-target-origin': 'off' },
    },
    {
      files: [
        'webview/vite.config.ts',
        'webview/vitest.config.ts',
        'webview/apps/*/vite.config.ts',
        'webview/apps/*/vitest.config.ts',
        'scripts/**/*.mjs',
      ],
      rules: { 'no-console': 'off', 'no-restricted-imports': 'off' },
    },
    {
      files: ['test/**/*.ts', 'src/**/*.test.ts', 'webview/**/*.test.ts', 'webview/**/*.test.tsx'],
      rules: {
        'no-console': 'off',
        'typescript/no-explicit-any': 'off',
        'unicorn/consistent-function-scoping': 'off',
      },
    },
  ],
});
