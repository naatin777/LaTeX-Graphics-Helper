import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  // VS Code integration test の出力先。
  // TypeScript の test/**/*.ts を tsc で out/test/**/*.js に compile してから実行する。
  files: "out/test/**/*.test.js",

  // テストに使う VS Code。
  // 同じcommitを同じVS Codeで再実行できるよう固定する。
  // latest stable compatibility testはrequired testと別jobで追加する。
  version: "1.105.0",

  // Extension Development Host に読み込ませる拡張のパス。
  // 通常は repo root。
  extensionDevelopmentPath: ".",

  // テスト用 workspace。
  // 実ファイル操作・workspace 解決・relative path 変換などを見るため、空の workspace より fixture を開く方がよい。
  workspaceFolder: "./test/fixtures/workspace",

  // Mocha 設定。
  // VS Code extension tests は Mocha under the hood。
  mocha: {
    // VS Code extension tests は Mocha under the hood。
    // suite/testを使うならtdd。
    ui: "tdd",

    // PDF / 画像 / CLI / ファイル操作は遅くなるので長めにする。
    timeout: 60000,

    // 遅いテストの目安。
    slow: 5000,

    // 各test caseの所要時間をCIログから確認できるようにする。
    reporter: "list",

    // async test の取りこぼしを減らす。
    color: true,
  },

  // VS Code 起動時の追加引数。
  // --disable-extensions は他拡張の影響を避けるため。
  // ただし自分の extensionDevelopmentPath は読み込まれる。
  launchArgs: [
    "--disable-extensions",

    // welcome / release notes などの UI ノイズを減らす。
    "--skip-welcome",

    // workspace trust の影響を減らす。
    "--disable-workspace-trust",
    ...(process.env.LGH_VSCODE_TEST_USER_DATA_DIR
      ? [`--user-data-dir=${process.env.LGH_VSCODE_TEST_USER_DATA_DIR}`]
      : []),
  ],
});
