import { defineConfig } from '@vscode/test-cli';

const distro = process.env.LGH_WSL_DISTRO ?? 'Ubuntu';
const workspace = process.env.LGH_WSL_WORKSPACE;
const extensionPath = process.env.LGH_WSL_EXTENSION_PATH;

if (!workspace || !extensionPath) {
	throw new Error('Remote-WSL tests require LGH_WSL_WORKSPACE and LGH_WSL_EXTENSION_PATH');
}

export default defineConfig({
	files: 'out/test/**/*.test.js',
	extensionDevelopmentPath: extensionPath,
	launchArgs: [
		'--folder-uri',
		`vscode-remote://wsl+${distro}${workspace}/`,
		'--disable-workspace-trust',
	],
	mocha: {
		timeout: 120_000,
	},
});
