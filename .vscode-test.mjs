import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  tests: [
    {
      files: "out/test/**/*.test.js",
      version: "1.128.0",
      extensionDevelopmentPath: ".",
      srcDir: "src",
      workspaceFolder: "./test/fixtures/workspace",
      mocha: {
        ui: "tdd",
        timeout: 60000,
        slow: 5000,
        reporter: "list",
        color: true,
      },
      launchArgs: [
        "--disable-extensions",
        "--skip-welcome",
        "--disable-workspace-trust",
        ...(process.env.LGH_VSCODE_TEST_USER_DATA_DIR
          ? [`--user-data-dir=${process.env.LGH_VSCODE_TEST_USER_DATA_DIR}`]
          : []),
      ],
    },
  ],
  coverage: {
    includeAll: true,
    reporter: ["text-summary", "html", "lcov"],
    exclude: ["src/**/*.d.ts", "**/test/**"],
  },
});
