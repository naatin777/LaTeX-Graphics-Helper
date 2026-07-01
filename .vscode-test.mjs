import { defineConfig } from '@vscode/test-cli';

const launchArgs = [
	'--disable-extensions',

	// welcome / release notes などの UI ノイズを減らす。
	'--skip-welcome',

	// workspace trust の影響を減らす。
	'--disable-workspace-trust',
];

if (process.env.LGH_VSCODE_TEST_USER_DATA_DIR) {
	launchArgs.push('--user-data-dir', process.env.LGH_VSCODE_TEST_USER_DATA_DIR);
}

if (process.env.LGH_VSCODE_TEST_EXTENSIONS_DIR) {
	launchArgs.push('--extensions-dir', process.env.LGH_VSCODE_TEST_EXTENSIONS_DIR);
}

export default defineConfig({
	// VS Code integration test の出力先。
	// TypeScript の test/**/*.ts を tsc で out/test/**/*.js に compile してから実行する。
	files: 'out/test/**/*.test.js',

	// テストに使う VS Code。
	// stable 固定でよい。最新 Insiders での検証は CI matrix や別 label で追加すればよい。
	version: 'stable',

	// Extension Development Host に読み込ませる拡張のパス。
	// 通常は repo root。
	extensionDevelopmentPath: '.',

	// テスト用 workspace。
	// 実ファイル操作・workspace 解決・relative path 変換などを見るため、空の workspace より fixture を開く方がよい。
	workspaceFolder: process.env.LGH_VSCODE_TEST_WORKSPACE ?? './test/fixtures/workspace',

	// Mocha 設定。
	// VS Code extension tests は Mocha under the hood。
	mocha: {
		// VS Code の extension sample と同じ TDD style。
		// suite/test を使うなら tdd。
		ui: 'tdd',

		// PDF / 画像 / CLI / ファイル操作は遅くなるので長めにする。
		timeout: 60000,

		// 遅いテストの目安。
		slow: 5000,

		// async test の取りこぼしを減らす。
		color: true,

		...(process.env.LGH_VSCODE_TEST_REPORTER
			? {
					reporter: process.env.LGH_VSCODE_TEST_REPORTER,
				}
			: {}),

		...(process.env.LGH_VSCODE_TEST_GREP
			? {
					grep: process.env.LGH_VSCODE_TEST_GREP,
					invert: process.env.LGH_VSCODE_TEST_INVERT === '1',
				}
			: {}),
	},

	// VS Code 起動時の追加引数。
	// --disable-extensions は他拡張の影響を避けるため。
	// ただし自分の extensionDevelopmentPath は読み込まれる。
	launchArgs,
});
