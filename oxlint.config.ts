import { defineConfig } from "oxlint";

const extensionRuntimeForbiddenPaths = [
  {
    name: "solid-js",
    message: "Solid is Webview frontend-only. Do not import it from the VS Code extension runtime.",
  },
  {
    name: "solid-js/web",
    message: "Solid DOM rendering is Webview frontend-only.",
  },
  {
    name: "pdfjs-dist",
    message: "PDF.js should be bundled into Webview frontend, not extension runtime.",
  },
  {
    name: "vite",
    message: "Vite belongs in Webview build config, not extension runtime code.",
  },
  {
    name: "vite-plugin-solid",
    message: "vite-plugin-solid belongs in Webview build config, not extension runtime code.",
  },
];

const coreForbiddenPaths = [
  {
    name: "vscode",
    message:
      "Keep VS Code API out of core/application/operation code. Convert VS Code objects in commands first.",
  },
  ...extensionRuntimeForbiddenPaths,
];

const webviewFrontendForbiddenPaths = [
  {
    name: "vscode",
    message:
      "Webview frontend cannot import the VS Code extension API. Use acquireVsCodeApi wrapper instead.",
  },
  {
    name: "fs",
    message: "Webview frontend runs in a browser-like environment. Do not import Node fs.",
  },
  {
    name: "node:fs",
    message: "Webview frontend runs in a browser-like environment. Do not import Node fs.",
  },
  {
    name: "path",
    message: "Webview frontend should not depend on Node path.",
  },
  {
    name: "node:path",
    message: "Webview frontend should not depend on Node path.",
  },
  {
    name: "child_process",
    message: "Webview frontend must not execute external processes.",
  },
  {
    name: "node:child_process",
    message: "Webview frontend must not execute external processes.",
  },
  {
    name: "os",
    message: "Webview frontend should not depend on Node os.",
  },
  {
    name: "node:os",
    message: "Webview frontend should not depend on Node os.",
  },
  {
    name: "crypto",
    message: "Use Web Crypto in Webview frontend instead of Node crypto.",
  },
  {
    name: "node:crypto",
    message: "Use Web Crypto in Webview frontend instead of Node crypto.",
  },
];

export default defineConfig({
  // Built-in plugin rule groups.
  // import / node / promise / unicorn / typescript 系を使えるようにする。
  plugins: ["eslint", "typescript", "unicorn", "oxc", "import", "node", "promise", "vitest"],

  // 大枠の推奨カテゴリ。
  // correctness は壊れる可能性が高いので error。
  // suspicious / perf は最初は warn にして、開発体験を壊しすぎない。
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },

  // oxlint-disable の残骸を検出する。
  options: {
    reportUnusedDisableDirectives: "warn",
  },

  // 生成物・依存物は lint しない。
  ignorePatterns: [
    "out/**",
    "dist/**",
    "coverage/**",
    "media/webview/**",
    "node_modules/**",
    ".vscode-test/**",
    ".playwright/**",
  ],

  rules: {
    // if / else / for / while は braces 必須寄り。
    // まず warn にして既存コード移行を楽にする。
    curly: "warn",

    // == / != は避ける。
    eqeqeq: "warn",

    // throw は Error object を投げる。
    "no-throw-literal": "error",

    // extension 開発中は一時的に console を使うことがあるので warn。
    // logger 導入後に error へ上げてもよい。
    "no-console": "warn",

    // ファイル操作の順序保証、ロールバック、キャンセル確認では逐次awaitを仕様として使う。
    // 並列化が適切な箇所はPromise.allまたはp-limitを明示的に選ぶ。
    "no-await-in-loop": "off",

    // 再代入しない変数は const。
    "prefer-const": "error",

    // var 禁止。
    "no-var": "error",

    // TS プロジェクトでは base no-unused-vars より typescript/no-unused-vars を使う。
    "no-unused-vars": "off",
    "typescript/no-unused-vars": "error",

    // type import を推奨する。
    "typescript/consistent-type-imports": "warn",

    // any は原則避けるが、VS Code API / test mock 周辺で必要になるため warn。
    "typescript/no-explicit-any": "warn",

    // CommonJS require は禁止。
    "typescript/no-require-imports": "error",

    // Node builtin は node: prefix に統一。
    "unicorn/prefer-node-protocol": "error",

    // VS Code extension runtime では Node builtin を使うので off。
    "import/no-nodejs-modules": "off",

    // 設定や CI で process.env を読む可能性があるので off。
    "node/no-process-env": "off",

    // Promise chain スタイルを強制しない。
    // async/await 中心にするため、ここは厳格化しない。
    "promise/always-return": "off",
    "promise/catch-or-return": "off",
  },

  overrides: [
    {
      // application / operations / latex / config は core 寄り。
      // VS Code API や Webview frontend に依存させない。
      files: [
        "src/application/**/*.ts",
        "src/operations/**/*.ts",
        "src/latex/**/*.ts",
        "src/config/**/*.ts",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: coreForbiddenPaths,
            patterns: [
              {
                group: ["../commands/*", "../../commands/*"],
                message:
                  "Core code must not depend on command/UI code. Pass plain data from commands instead.",
              },
              {
                group: ["../webview/*", "../../webview/*"],
                message: "Core code must not depend on VS Code Webview presentation code.",
              },
              {
                group: ["@webview-shared/*", "../../webview/*", "../../../webview/*"],
                message: "Extension core must not import Webview frontend modules.",
              },
            ],
          },
        ],
      },
    },

    {
      // commands / src/webview / extension.ts は VS Code API を触ってよい runtime 層。
      // ただし Solid app や pdfjs-dist を直接 import しない。
      files: ["src/commands/**/*.ts", "src/webview/**/*.ts", "src/extension.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: extensionRuntimeForbiddenPaths,
            patterns: [
              {
                group: ["../../webview/apps/*", "../../../webview/apps/*", "@webview-shared/*"],
                message: "VS Code extension runtime must not import Webview frontend source.",
              },
            ],
          },
        ],
      },
    },

    {
      // pdf-workbench は単独 app。
      // extension runtime / Node builtin / 他 app への依存を禁止する。
      files: ["webview/apps/pdf-workbench/**/*.ts", "webview/apps/pdf-workbench/**/*.tsx"],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: webviewFrontendForbiddenPaths,
            patterns: [
              {
                group: ["../../src/*", "../../../src/*", "../../../../src/*"],
                message: "Webview frontend must not import extension runtime modules.",
              },
              {
                group: ["../pdf-arranger/*", "../../pdf-arranger/*"],
                message:
                  "pdf-workbench must not import pdf-arranger directly. Move shared code to webview/shared.",
              },
            ],
          },
        ],
      },
    },

    {
      // pdf-arranger は単独 app。
      // extension runtime / Node builtin / 他 app への依存を禁止する。
      files: ["webview/apps/pdf-arranger/**/*.ts", "webview/apps/pdf-arranger/**/*.tsx"],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: webviewFrontendForbiddenPaths,
            patterns: [
              {
                group: ["../../src/*", "../../../src/*", "../../../../src/*"],
                message: "Webview frontend must not import extension runtime modules.",
              },
              {
                group: ["../pdf-workbench/*", "../../pdf-workbench/*"],
                message:
                  "pdf-arranger must not import pdf-workbench directly. Move shared code to webview/shared.",
              },
            ],
          },
        ],
      },
    },

    {
      // webview/shared は frontend shared。
      // app 固有コードや extension runtime に依存させない。
      files: ["webview/shared/**/*.ts"],
      env: {
        browser: true,
        node: false,
      },
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: webviewFrontendForbiddenPaths,
            patterns: [
              {
                group: ["../apps/*", "../../apps/*"],
                message: "webview/shared must not import app-specific modules.",
              },
              {
                group: ["../src/*", "../../src/*", "../../../src/*"],
                message: "webview/shared must not import extension runtime modules.",
              },
            ],
          },
        ],
      },
    },

    {
      // Vite / Vitest config と scripts は Node 実行。
      // ここでは node:path / node:fs などを普通に使う。
      files: [
        "webview/vite.config.ts",
        "webview/vitest.config.ts",
        "webview/apps/*/vite.config.ts",
        "webview/apps/*/vitest.config.ts",
        "scripts/**/*.mjs",
      ],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        // config / scripts では console を許可。
        "no-console": "off",

        // build config は vite / vite-plugin-solid / node builtin を import するので制限しない。
        "no-restricted-imports": "off",
      },
    },

    {
      // VS Code extension の Mocha test と Vitest test。
      files: ["test/**/*.ts", "src/**/*.test.ts", "webview/**/*.test.ts", "webview/**/*.test.tsx"],
      env: {
        node: true,
      },
      globals: {
        suite: "readonly",
        test: "readonly",
        suiteSetup: "readonly",
        suiteTeardown: "readonly",
        setup: "readonly",
        teardown: "readonly",
      },
      rules: {
        // test では調査用の console を許可。
        "no-console": "off",

        // mock / fake / unknown payload の検証で any が必要になる場合がある。
        "typescript/no-explicit-any": "off",
      },
    },
  ],
});
