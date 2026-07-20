import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const supportedTargets = new Set([
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
]);

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
  const currentTarget = getCurrentTarget();
  const target = values.target ?? currentTarget;

  if (!supportedTargets.has(target)) {
    throw new Error(`Unsupported VSIX target: ${target}`);
  }
  if (target !== currentTarget) {
    throw new Error(`VSIX target ${target} must match the current runner target ${currentTarget}`);
  }

  return {
    outputPath: path.resolve(rootDirectory, values.out ?? `latex-graphics-helper-${target}.vsix`),
    target,
  };
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

const { outputPath, target } = parsePackageArguments(process.argv.slice(2));
await mkdir(path.dirname(outputPath), { recursive: true });
await runCommand(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['--no-install', 'vsce', 'package', '--target', target, '--out', outputPath],
  {
    cwd: rootDirectory,
  },
);
