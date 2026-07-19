import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const supportedTargets = new Set([
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
]);
const runtimeFiles = [
  'CHANGELOG.md',
  'LICENSE',
  'README.ja.md',
  'README.md',
  'assets',
  'media',
  'out',
  '.vscodeignore',
  'package.nls.ja.json',
  'package.nls.json',
];

function parsePackageArguments(args) {
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  const { values } = parseArgs({
    args: normalizedArgs,
    options: {
      out: { type: 'string' },
      target: { type: 'string' },
    },
    strict: true,
  });

  const target = values.target ?? getCurrentTarget();
  if (!supportedTargets.has(target)) {
    throw new Error(`Unsupported VSIX target: ${target}`);
  }
  if (target !== getCurrentTarget()) {
    throw new Error(`VSIX target ${target} must match the current runner target ${getCurrentTarget()}`);
  }

  const outputPath = path.resolve(rootDirectory, values.out ?? `latex-graphics-helper-${target}.vsix`);
  return { outputPath, target };
}

function getCurrentTarget() {
  const platform = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32',
  }[process.platform];
  const architecture = {
    arm64: 'arm64',
    x64: 'x64',
  }[process.arch];

  if (!platform || !architecture) {
    throw new Error(`Unsupported packaging platform: ${process.platform}/${process.arch}`);
  }
  return `${platform}-${architecture}`;
}

function createRuntimeManifest(packageManifest) {
  const {
    devDependencies: _devDependencies,
    packageManager: _packageManager,
    pnpm: _pnpm,
    scripts: _scripts,
    ...runtimeManifest
  } = packageManifest;
  return runtimeManifest;
}

async function copyRuntimeFiles(stageDirectory) {
  for (const relativePath of runtimeFiles) {
    await cp(path.join(rootDirectory, relativePath), path.join(stageDirectory, relativePath), {
      recursive: true,
    });
  }
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with ${signal ? `signal ${signal}` : `code ${code}`}`));
    });
  });
}

function getPnpmScript() {
  const npmExecPath = process.env.npm_execpath;

  if (!npmExecPath || npmExecPath.toLowerCase().endsWith('.cmd')) {
    throw new Error('package-vsix.mjs must be run through pnpm so npm_execpath points to the pnpm JavaScript CLI.');
  }

  return path.resolve(rootDirectory, npmExecPath);
}

async function packageVsix({ outputPath, target }) {
  const packageManifest = JSON.parse(await readFile(path.join(rootDirectory, 'package.json'), 'utf8'));
  const stageDirectory = await mkdtemp(path.join(os.tmpdir(), 'latex-graphics-helper-vsix-'));

  try {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await runCommand(
      process.execPath,
      [getPnpmScript(), '--filter', '.', 'deploy', '--prod', '--legacy', stageDirectory],
      { cwd: rootDirectory },
    );
    await runCommand(process.execPath, [getPnpmScript(), 'install', '--prod', '--no-frozen-lockfile'], {
      cwd: stageDirectory,
    });
    await writeFile(
      path.join(stageDirectory, 'package.json'),
      `${JSON.stringify(createRuntimeManifest(packageManifest), null, 2)}\n`,
    );
    await copyRuntimeFiles(stageDirectory);

    await runCommand(
      process.execPath,
      [
        path.join(rootDirectory, 'node_modules', '@vscode', 'vsce', 'vsce'),
        'package',
        '--target',
        target,
        '--out',
        outputPath,
      ],
      { cwd: stageDirectory },
    );
  } finally {
    await rm(stageDirectory, { force: true, recursive: true });
  }
}

const packageArguments = parsePackageArguments(process.argv.slice(2));
await packageVsix(packageArguments);
