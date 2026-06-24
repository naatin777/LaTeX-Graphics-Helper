export default {
  // Editor 補完用 schema。
  $schema: "./node_modules/oxfmt/configuration_schema.json",
  // TS / JS は single quote に統一。
  singleQuote: true,
  // TSX / JSX の属性文字列も single quote に寄せる。
  jsxSingleQuote: true,
  // 文末 semicolon は必須。
  semi: true,
  // 複数行 object / array / function params の diff を小さくする。
  trailingComma: "all",
  // 不要な property quote は外す。
  quoteProps: "as-needed",
  // object literal の改行は作者の意図を残す。
  objectWrap: "preserve",
  // 2 spaces。
  tabWidth: 2,
  useTabs: false,
  // 横幅はやや広め。VS Code extension の config object が多いため。
  printWidth: 120,
  // OS 差分を避ける。
  endOfLine: "lf",
  // POSIX 的に最終改行を入れる。
  insertFinalNewline: true,
  // object spacing は通常の JS/TS style。
  bracketSpacing: true,
  // 複数行 JSX/HTML attribute の閉じ bracket は別行。
  bracketSameLine: false,
  // arrow function parameter は常に括弧あり。
  arrowParens: "always",
  // TSX/HTML の差分を読みやすくする。
  singleAttributePerLine: true,
  // Markdown の文章折り返しは勝手に変えない。
  proseWrap: "preserve",
  // 生成物・依存物は format しない。
  // media/webview は Vite の出力なので必ず除外。
  ignorePatterns: [
    "out/**",
    "dist/**",
    "coverage/**",
    "media/webview/**",
    "node_modules/**",
    ".vscode-test/**",
    ".playwright/**",
  ],
  // package.json の key 並びを安定化。
  sortPackageJson: true,
  // import 順序を固定。
  // CSS などの side-effect import は先頭に分離する。
  sortImports: {
    groups: [
      "side-effect",
      "builtin",
      "external",
      ["internal", "subpath"],
      "parent",
      "sibling",
      "index",
    ],
    newlinesBetween: true,
    ignoreCase: true,
    order: "asc",
  },
  // ファイル種別ごとの上書き。
  // 複数 override に match した場合は後ろの override が優先。
  overrides: [
    {
      files: ["*.json", "*.jsonc"],
      options: {
        // JSON / JSONC では trailing comma を避ける。
        // package.json 等で余計な差分を作らないため。
        trailingComma: "none",
        // JSON 設定ファイルは横幅 120 のまま。
        printWidth: 120,
      },
    },
    {
      files: ["*.md"],
      options: {
        // README の表・コードブロックを勝手に折り返さない。
        proseWrap: "preserve",
      },
    },
    {
      files: ["*.html", "*.tsx", "*.jsx"],
      options: {
        // Webview HTML / Solid TSX の attribute 差分を読みやすくする。
        singleAttributePerLine: true,
      },
    },
  ],
};
