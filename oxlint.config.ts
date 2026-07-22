import { defineConfig, type OxlintOverride } from 'oxlint';

const extensionOnly = [
  {
    name: 'solid-js',
    message: 'Solid is Webview frontend-only.',
  },
  {
    name: 'solid-js/web',
    message: 'Solid DOM rendering is Webview frontend-only.',
  },
  {
    name: 'pdfjs-dist',
    message: 'PDF.js belongs in Webview frontend.',
  },
  {
    name: 'vite',
    message: 'Vite belongs in Webview build config.',
  },
  {
    name: 'vite-plugin-solid',
    message: 'vite-plugin-solid belongs in Webview build config.',
  },
];

const browserOnly = [
  {
    name: 'vscode',
    message: 'Webview frontend must use the acquireVsCodeApi wrapper.',
  },
  {
    name: 'fs',
    message: 'Webview frontend must not import Node fs.',
  },
  {
    name: 'node:fs',
    message: 'Webview frontend must not import Node fs.',
  },
  {
    name: 'path',
    message: 'Webview frontend must not import Node path.',
  },
  {
    name: 'node:path',
    message: 'Webview frontend must not import Node path.',
  },
  {
    name: 'child_process',
    message: 'Webview frontend must not execute external processes.',
  },
  {
    name: 'node:child_process',
    message: 'Webview frontend must not execute external processes.',
  },
  {
    name: 'os',
    message: 'Webview frontend must not import Node os.',
  },
  {
    name: 'node:os',
    message: 'Webview frontend must not import Node os.',
  },
  {
    name: 'crypto',
    message: 'Use Web Crypto in Webview frontend.',
  },
  {
    name: 'node:crypto',
    message: 'Use Web Crypto in Webview frontend.',
  },
];

const corePaths = [
  {
    name: 'vscode',
    message: 'Core code must not import the VS Code API.',
  },
  ...extensionOnly,
];

const corePatterns = [
  {
    group: ['../commands/*', '../../commands/*'],
    message: 'Core code must not import command/UI code.',
  },
  {
    group: ['../presentation/*', '../../presentation/*'],
    message: 'Core code must not import Webview presentation code.',
  },
  {
    group: ['@webview-shared/*', '../../presentation/*', '../../../presentation/*'],
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
  'no-restricted-imports': [
    'error',
    {
      paths,
      patterns,
    },
  ],
});

const appOverrides: OxlintOverride[] = [
  {
    files: ['webview/apps/*/src/**/*.ts', 'webview/apps/*/src/**/*.tsx'],
    rules: restrictedImports(browserOnly, [
      ...frontendPatterns,
      {
        group: ['../*/src/*', '../../*/src/*'],
        message: 'Webview frontend must not import another app.',
      },
    ]),
  },
  {
    files: ['webview/shared/**/*.ts'],
    rules: restrictedImports(browserOnly, [
      {
        group: ['../apps/*', '../../apps/*'],
        message: 'webview/shared must not import app-specific modules.',
      },
      {
        group: ['../src/*', '../../src/*', '../../../src/*'],
        message: 'webview/shared must not import extension runtime.',
      },
    ]),
  },
];

export default defineConfig({
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'node', 'promise'],

  categories: {
    correctness: 'error',
    perf: 'warn',
  },

  options: {
    reportUnusedDisableDirectives: 'warn',
    typeAware: true,
  },

  ignorePatterns: [
    'out/**',
    'dist/**',
    'coverage/**',
    'media/webview/**',
    'node_modules/**',
    '.vscode-test/**',
    '.playwright/**',
  ],

  jsPlugins: [
    {
      name: 'project',
      specifier: './scripts/oxlint-project-plugin.mjs',
    },
  ],

  rules: {
    /*
     * Basic safety and readability
     */
    curly: ['error', 'all'],
    eqeqeq: 'warn',
    'no-console': 'warn',
    'no-await-in-loop': 'off',

    /*
     * TypeScript
     */
    'no-unused-vars': 'off',
    'typescript/no-unused-vars': 'error',
    'typescript/consistent-type-imports': 'warn',
    'typescript/no-explicit-any': 'error',
    'typescript/no-require-imports': 'error',

    /*
     * Error handling
     *
     * no-throw-literal is deprecated in favor of the type-aware rule.
     */
    'no-throw-literal': 'off',
    'typescript/only-throw-error': [
      'error',
      {
        allowRethrowing: false,
        allowThrowingAny: false,
        allowThrowingUnknown: false,
      },
    ],
    'typescript/prefer-promise-reject-errors': [
      'error',
      {
        allowEmptyReject: false,
        allowThrowingAny: false,
        allowThrowingUnknown: false,
      },
    ],

    /*
     * Promise correctness
     */
    'typescript/no-misused-promises': 'error',

    /*
     * Exhaustiveness
     */
    'typescript/switch-exhaustiveness-check': [
      'error',
      {
        allowDefaultCaseForExhaustiveSwitch: true,
        considerDefaultExhaustiveForUnions: false,
        requireDefaultForNonUnion: false,
      },
    ],
    'typescript/no-unsafe-argument': 'off',
    'typescript/no-unsafe-assignment': 'off',
    'typescript/no-unsafe-call': 'off',
    'typescript/no-unsafe-member-access': 'off',
    'typescript/no-unsafe-return': 'off',
    'typescript/no-unsafe-type-assertion': 'off',
    'typescript/no-unnecessary-type-assertion': 'off',
    'typescript/no-unnecessary-condition': 'off',

    /*
     * Imports and runtime conventions
     */
    'unicorn/prefer-node-protocol': 'error',
    'import/no-nodejs-modules': 'off',
    'node/no-process-env': 'off',

    /*
     * Promise plugin rules superseded or intentionally disabled
     */
    'promise/always-return': 'off',
    'promise/catch-or-return': 'off',

    /*
     * Project-specific rules
     */
    'project/max-conditional-spreads-per-object': 'error',
  },

  overrides: [
    {
      files: ['src/application/**/*.ts', 'src/operations/**/*.ts', 'src/config/**/*.ts'],
      rules: restrictedImports(corePaths, corePatterns),
    },
    {
      files: ['src/commands/**/*.ts', 'src/presentation/**/*.ts', 'src/extension.ts'],
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
      rules: {
        'unicorn/require-post-message-target-origin': 'off',
      },
    },
    {
      files: [
        'webview/vite.config.ts',
        'webview/vitest.config.ts',
        'webview/apps/*/vite.config.ts',
        'webview/apps/*/vitest.config.ts',
        'scripts/**/*.mjs',
      ],
      rules: {
        'no-console': 'off',
        'no-restricted-imports': 'off',
      },
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
