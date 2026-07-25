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
    // include globs currently discard the Extension Host V8 entries after remapping.
    // Keep source discovery anchored by srcDir and exclude only known non-source files.
    includeAll: process.platform !== "win32",
    reporter: ["text-summary", "html", "lcov"],
    exclude: ["**/*.d.ts", "**/test/**", "**/scripts/**"],
  },
});
