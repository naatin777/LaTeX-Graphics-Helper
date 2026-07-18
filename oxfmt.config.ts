export default {
  $schema: './node_modules/oxfmt/configuration_schema.json',
  singleQuote: true,
  jsxSingleQuote: true,
  printWidth: 120,
  singleAttributePerLine: true,
  proseWrap: 'preserve',
  ignorePatterns: [
    'out/**',
    'dist/**',
    'coverage/**',
    'media/webview/**',
    'node_modules/**',
    '.vscode-test/**',
    '.playwright/**',
  ],
};
