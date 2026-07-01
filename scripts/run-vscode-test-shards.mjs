import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const shards = [
	{
		name: 'convert',
		grep: '変換',
		invert: false,
	},
	{
		name: 'non-convert',
		grep: '変換',
		invert: true,
	},
];

const repositoryRoot = process.cwd();
const fixtureWorkspacePath = path.join(repositoryRoot, 'test', 'fixtures', 'workspace');
const temporaryBase = process.platform === 'win32' ? tmpdir() : '/tmp';
const temporaryRoot = await mkdtemp(path.join(temporaryBase, 'lgh-vt-'));

try {
	const results = await Promise.all(shards.map((shard) => runShard(shard)));
	const failedResults = results.filter((result) => result.exitCode !== 0);

	if (failedResults.length > 0) {
		for (const result of failedResults) {
			console.error(`vscode-test shard failed: ${result.name} (exit code: ${result.exitCode})`);
		}

		process.exit(1);
	}
} finally {
	await rm(temporaryRoot, { recursive: true, force: true });
}

async function runShard(shard) {
	const shardRoot = path.join(temporaryRoot, shard.name);
	const workspacePath = path.join(shardRoot, 'w');
	const userDataDir = path.join(shardRoot, 'u');
	const extensionsDir = path.join(shardRoot, 'e');

	await cp(fixtureWorkspacePath, workspacePath, { recursive: true });

	return new Promise((resolve) => {
		const child = spawn(
			process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
			['exec', 'vscode-test'],
			{
				cwd: repositoryRoot,
				env: {
					...process.env,
					LGH_VSCODE_TEST_WORKSPACE: workspacePath,
					LGH_VSCODE_TEST_USER_DATA_DIR: userDataDir,
					LGH_VSCODE_TEST_EXTENSIONS_DIR: extensionsDir,
					LGH_VSCODE_TEST_GREP: shard.grep,
					LGH_VSCODE_TEST_INVERT: shard.invert ? '1' : '0',
					LGH_VSCODE_TEST_REPORTER: 'list',
				},
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		);

		child.stdout.on('data', (chunk) => {
			process.stdout.write(prefixLines(shard.name, chunk));
		});
		child.stderr.on('data', (chunk) => {
			process.stderr.write(prefixLines(shard.name, chunk));
		});
		child.on('close', (exitCode) => {
			resolve({ name: shard.name, exitCode: exitCode ?? 1 });
		});
	});
}

function prefixLines(shardName, chunk) {
	return chunk
		.toString()
		.split(/\r?\n/)
		.map((line, index, lines) => {
			if (index === lines.length - 1 && line === '') {
				return line;
			}

			return `[${shardName}] ${line}`;
		})
		.join('\n');
}
