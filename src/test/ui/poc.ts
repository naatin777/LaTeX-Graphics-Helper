#!/usr/bin/env node
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { _electron, type ElectronApplication, type Page } from 'playwright-core';

import {
    SAMPLE_FILE_NAME,
    createRunId,
    defaultArtifactsRoot,
    prepareIsolatedEnvironment,
    removeIsolatedEnvironment,
    sha256File,
    type IsolatedEnvironment,
} from './lib/environment';
import { verifySplitOutcome, type SplitOutcome } from './lib/verification';
import { resolveVSCodeExecutable } from './lib/vscode';

// Compiled output lives at out/test/ui/poc.js, three levels below the repo root.
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const COMMAND_LABEL = 'Split PDF';
const COMMAND_ID = 'latex-graphics-helper.splitPdf';

interface Options {
    artifactsDir?: string;
    executable?: string;
    help: boolean;
    keep: boolean;
    timeout: number;
}

interface State {
    electronApp?: ElectronApplication;
    process?: ChildProcess;
    page?: Page;
    logStream?: fs.WriteStream;
    streams: fs.WriteStream[];
    profileRoot?: string;
    keep: boolean;
}

interface ContextMenuCheck {
    source: string;
    label: string;
    visibleItems: string[];
}

interface RunResult {
    status: 'failed' | 'passed';
    startedAt: string;
    finishedAt?: string;
    runId: string;
    command: string;
    environment: Record<string, unknown>;
    checks: {
        contextMenu?: ContextMenuCheck;
        output?: SplitOutcome;
        notifications?: { hasError: boolean; text: string };
    };
    error?: { message: string; stack?: string };
}

const state: State = {
    electronApp: undefined,
    process: undefined,
    page: undefined,
    logStream: undefined,
    streams: [],
    profileRoot: undefined,
    keep: false,
};

function log(message: string): void {
    const line = `[${new Date().toISOString()}] ${message}`;
    process.stdout.write(`${line}\n`);
    state.logStream?.write(`${line}\n`);
}

function warn(message: string): void {
    const line = `[${new Date().toISOString()}] WARN ${message}`;
    process.stderr.write(`${line}\n`);
    state.logStream?.write(`${line}\n`);
}

function parseArgs(argv: string[]): Options {
    const options: Options = {
        artifactsDir: undefined,
        executable: process.env.LGH_UI_POC_VSCODE_EXECUTABLE,
        help: false,
        keep: false,
        timeout: 120_000,
    };

    for (let index = 0; index < argv.length; index++) {
        const argument = argv[index];
        switch (argument) {
            case '--keep':
                options.keep = true;
                break;
            case '--help':
            case '-h':
                options.help = true;
                break;
            case '--artifacts-dir':
                options.artifactsDir = path.resolve(readValue(argv, ++index, argument));
                break;
            case '--executable':
            case '--vscode-executable':
                options.executable = path.resolve(readValue(argv, ++index, argument));
                break;
            case '--timeout':
                options.timeout = Number(readValue(argv, ++index, argument));
                if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
                    throw new Error(`Invalid --timeout value: ${argv[index]}`);
                }
                break;
            default:
                throw new Error(`Unknown argument: ${argument}`);
        }
    }

    return options;
}

function readValue(argv: string[], index: number, argument: string): string {
    const value = argv[index];
    if (!value || value.startsWith('-')) {
        throw new Error(`Missing value for ${argument}`);
    }
    return value;
}

function printHelp(): void {
    process.stdout.write(`Usage: node out/test/ui/poc.js [options]

Launches an isolated VS Code (Extension Development Host) with Playwright,
runs "${COMMAND_LABEL}" on a PDF from the Explorer context menu, and verifies
the generated files and that the source PDF was not modified.

Options:
  --executable <path>    VS Code Electron executable (or set LGH_UI_POC_VSCODE_EXECUTABLE)
  --artifacts-dir <dir>  Where screenshots/logs/results are written
                         (default: <repo>/.vscode-test/ui-poc/<timestamp>)
  --timeout <ms>         Launch/UI timeout (default: 120000)
  --keep                 Keep the throw-away VS Code profile (user-data/extensions/workspace)
  -h, --help             Show this help

Run "npm run compile" first; both the extension and this script must be compiled.
`);
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        printHelp();
        return;
    }

    const extensionEntry = path.join(repoRoot, 'out', 'extension.js');
    if (!fs.existsSync(extensionEntry)) {
        throw new Error(
            `Compiled extension entry not found: ${extensionEntry}\n` +
                'Run "npm run compile" (or "npm run watch") before running the UI PoC.',
        );
    }

    const runId = createRunId();
    const artifactsRoot = options.artifactsDir ?? defaultArtifactsRoot(repoRoot);
    const environment = await prepareIsolatedEnvironment({ artifactsRoot, runId });

    state.profileRoot = environment.profileRoot;
    state.keep = options.keep;
    state.logStream = fs.createWriteStream(path.join(environment.artifactsDir, 'run.log'));

    log(`Artifacts: ${environment.artifactsDir}`);
    log(`Isolated profile (user-data/extensions/workspace): ${environment.profileRoot}`);

    const result: RunResult = {
        status: 'failed',
        startedAt: new Date().toISOString(),
        runId,
        command: COMMAND_ID,
        environment: {
            platform: process.platform,
            node: process.version,
            profileRoot: environment.profileRoot,
            workspaceDir: environment.workspaceDir,
            userDataDir: environment.userDataDir,
            extensionsDir: environment.extensionsDir,
            artifactsDir: environment.artifactsDir,
        },
        checks: {},
    };

    try {
        const executablePath = await resolveVSCodeExecutable({
            explicitPath: options.executable,
            repoRoot,
            log,
        });
        result.environment.vscodeExecutable = executablePath;
        log(`VS Code executable: ${executablePath}`);

        const inputHashBefore = await sha256File(environment.inputPath);

        const electronApp = await launchVSCode({
            executablePath,
            environment,
            timeout: options.timeout,
        });
        state.electronApp = electronApp;
        state.process = electronApp.process();
        attachProcessLogs(state.process, environment.artifactsDir);
        log(`Launched VS Code (pid ${state.process.pid})`);

        const vscodeInfo = await electronApp.evaluate(
            ({ app }) => ({
                name: app.getName(),
                version: app.getVersion(),
                userData: app.getPath('userData'),
                electron: process.versions.electron,
                chromium: process.versions.chrome,
                node: process.versions.node,
            }),
            undefined,
        );
        result.environment.vscode = vscodeInfo;
        log(
            `VS Code ${vscodeInfo.version} / Electron ${vscodeInfo.electron} / Chromium ${vscodeInfo.chromium}`,
        );

        const page = await getWorkbenchPage(electronApp, options.timeout);
        state.page = page;
        attachPageLogs(page, environment.artifactsDir);
        log(`Workbench window ready: ${page.url()}`);

        result.checks.contextMenu = await runCommandFromExplorerContextMenu({
            page,
            artifactsDir: environment.artifactsDir,
            timeout: options.timeout,
        });
        log(`Invoked "${COMMAND_LABEL}" from the Explorer context menu`);

        await captureScreenshot(page, environment.artifactsDir, '03-after-command.png');

        result.checks.output = await verifySplitOutcome({
            inputPath: environment.inputPath,
            outputDir: environment.outputDir,
            expectedOutputPaths: environment.expectedOutputPaths,
            pageSizes: environment.pageSizes,
            inputHashBefore,
            timeoutMs: Math.min(options.timeout, 60_000),
        });
        result.checks.notifications = await collectNotifications(page);
        const output = result.checks.output;
        log(
            `Verified ${output.outputs.length} split PDFs; input unchanged=${output.input.unchanged}`,
        );

        result.status = 'passed';
    } catch (error) {
        const failure = toError(error);
        result.error = { message: failure.message, stack: failure.stack };
        warn(failure.stack ?? failure.message);
        if (state.page) {
            await captureScreenshot(state.page, environment.artifactsDir, '99-failure.png');
        }
        process.exitCode = 1;
    } finally {
        result.finishedAt = new Date().toISOString();

        await shutdown();

        if (!options.keep) {
            try {
                await removeIsolatedEnvironment(environment);
            } catch (error) {
                warn(`Failed to remove the isolated profile: ${errorMessage(error)}`);
            }
        } else {
            log(`Keeping isolated profile: ${environment.profileRoot}`);
        }

        const resultPath = path.join(environment.artifactsDir, 'result.json');
        try {
            await fsp.writeFile(resultPath, `${JSON.stringify(result, undefined, 2)}\n`);
            log(`Result: ${result.status} (${resultPath})`);
        } catch (error) {
            warn(`Failed to write ${resultPath}: ${errorMessage(error)}`);
        } finally {
            state.logStream?.end();
        }
    }
}

function launchVSCode({
    executablePath,
    environment,
    timeout,
}: {
    executablePath: string;
    environment: IsolatedEnvironment;
    timeout: number;
}): Promise<ElectronApplication> {
    // The same launch shape used by VS Code's own Playwright-based automation.
    const args = [
        environment.workspaceDir,
        '--skip-release-notes',
        '--skip-welcome',
        '--disable-telemetry',
        '--disable-experiments',
        '--no-cached-data',
        '--disable-updates',
        '--disable-workspace-trust',
        `--crash-reporter-directory=${environment.crashesDir}`,
        `--logsPath=${environment.logsDir}`,
        `--user-data-dir=${environment.userDataDir}`,
        `--extensions-dir=${environment.extensionsDir}`,
        `--extensionDevelopmentPath=${repoRoot}`,
        '--locale=en',
        '--use-inmemory-secretstorage',
        '--log=info',
    ];

    return _electron.launch({
        executablePath,
        args,
        cwd: environment.workspaceDir,
        env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
        timeout,
    });
}

function attachProcessLogs(child: ChildProcess, artifactsDir: string): void {
    const stdoutStream = fs.createWriteStream(path.join(artifactsDir, 'vscode.stdout.log'));
    const stderrStream = fs.createWriteStream(path.join(artifactsDir, 'vscode.stderr.log'));

    child.stdout?.pipe(stdoutStream);
    child.stderr?.pipe(stderrStream);
    state.streams.push(stdoutStream, stderrStream);
}

function attachPageLogs(page: Page, artifactsDir: string): void {
    const stream = fs.createWriteStream(path.join(artifactsDir, 'page-console.log'));

    page.on('console', (message) => {
        stream.write(`[${message.type()}] ${message.text()}\n`);
    });
    page.on('pageerror', (error) => {
        stream.write(`[pageerror] ${error.stack ?? error.message}\n`);
    });
    page.on('dialog', (dialog) => {
        stream.write(`[dialog] ${dialog.type()}: ${dialog.message()}\n`);
        void dialog.dismiss();
    });

    state.streams.push(stream);
}

async function getWorkbenchPage(electronApp: ElectronApplication, timeout: number): Promise<Page> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
        for (const candidate of electronApp.windows()) {
            try {
                if (await candidate.locator('.monaco-workbench').isVisible()) {
                    return candidate;
                }
            } catch {
                // The splash window may already be closed.
            }
        }

        await delay(250);
    }

    throw new Error(
        'Timed out waiting for the VS Code workbench window. See the screenshots and logs in the artifacts directory.',
    );
}

async function runCommandFromExplorerContextMenu({
    page,
    artifactsDir,
    timeout,
}: {
    page: Page;
    artifactsDir: string;
    timeout: number;
}): Promise<ContextMenuCheck> {
    await page.locator('.monaco-workbench').waitFor({ state: 'visible', timeout });
    await ensureExplorerVisible(page);

    const explorer = page.locator('.explorer-folders-view');
    await explorer.waitFor({ state: 'visible', timeout });

    const row = explorer.locator('.monaco-list-row').filter({ hasText: SAMPLE_FILE_NAME }).first();
    await row.waitFor({ state: 'visible', timeout: Math.min(timeout, 60_000) });
    await captureScreenshot(page, artifactsDir, '01-workbench.png');

    await row.click({ button: 'right' });

    const menu = page.locator('.monaco-menu-container:visible .monaco-menu').first();
    await menu.waitFor({ state: 'visible', timeout: 15_000 });

    const labels = (await menu.locator('.action-label').allInnerTexts())
        .map((label) => label.trim())
        .filter(Boolean);
    await captureScreenshot(page, artifactsDir, '02-context-menu.png');

    assert.ok(
        labels.includes(COMMAND_LABEL),
        `Expected "${COMMAND_LABEL}" in the Explorer context menu. Visible items: ${labels.join(', ')}`,
    );

    await menu.getByText(COMMAND_LABEL, { exact: true }).first().click();
    log(`Context menu item selected: ${COMMAND_LABEL}`);

    return {
        source: 'explorer/context',
        label: COMMAND_LABEL,
        visibleItems: labels,
    };
}

async function ensureExplorerVisible(page: Page): Promise<void> {
    const explorer = page.locator('.explorer-folders-view');
    if (await explorer.isVisible().catch(() => false)) {
        return;
    }

    log('Explorer view is not visible; activating the Explorer activity bar item.');

    const activityItem = page
        .locator('.activitybar .action-item')
        .filter({ has: page.locator('[aria-label="Explorer"]') })
        .first();

    if ((await activityItem.count()) > 0) {
        await activityItem.click();
    }
}

async function collectNotifications(page: Page): Promise<{ hasError: boolean; text: string }> {
    try {
        const containers = page.locator('.notifications-toast-container');
        return {
            hasError:
                (await page.locator('.notifications-toast-container .codicon-error').count()) > 0,
            text: (await containers.allInnerTexts()).join('\n').trim(),
        };
    } catch (error) {
        return { hasError: false, text: `Could not read notifications: ${errorMessage(error)}` };
    }
}

async function captureScreenshot(
    page: Page,
    artifactsDir: string,
    fileName: string,
): Promise<void> {
    try {
        await page.screenshot({
            path: path.join(artifactsDir, fileName),
            animations: 'disabled',
        });
        log(`Screenshot: ${fileName}`);
    } catch (error) {
        warn(`Failed to capture ${fileName}: ${errorMessage(error)}`);
    }
}

let shutdownPromise: Promise<void> | undefined;

function shutdown(): Promise<void> {
    if (shutdownPromise) {
        return shutdownPromise;
    }

    shutdownPromise = (async () => {
        const child = state.process;

        if (state.electronApp) {
            try {
                await withTimeout(state.electronApp.close(), 15_000, 'ElectronApplication.close()');
                log('VS Code closed gracefully.');
            } catch (error) {
                warn(`Graceful close failed: ${errorMessage(error)}`);
            }
        }

        if (child && child.exitCode === null && !child.killed) {
            try {
                child.kill('SIGKILL');
                log('Sent SIGKILL to the VS Code process.');
            } catch (error) {
                warn(`Failed to kill the VS Code process: ${errorMessage(error)}`);
            }
            await waitForChildExit(child, 5_000);
        }

        for (const stream of state.streams) {
            stream.end();
        }
    })();

    return shutdownPromise;
}

function withTimeout(
    promise: Promise<unknown>,
    milliseconds: number,
    label: string,
): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;

    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`${label} timed out after ${milliseconds}ms`)),
                milliseconds,
            );
        }),
    ]);
}

function waitForChildExit(child: ChildProcess, milliseconds: number): Promise<void> {
    if (child.exitCode !== null || child.signalCode) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const timer = setTimeout(resolve, milliseconds);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve();
        });
    });
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function installSignalHandlers(): void {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(signal, () => {
            log(`Received ${signal}; shutting down.`);
            void (async () => {
                await shutdown();
                if (!state.keep && state.profileRoot) {
                    await removeIsolatedEnvironment({ profileRoot: state.profileRoot }).catch(
                        () => {},
                    );
                }
                process.exit(signal === 'SIGINT' ? 130 : 143);
            })();
        });
    }
}

function toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}

function errorMessage(error: unknown): string {
    return toError(error).message;
}

installSignalHandlers();

main().catch((error: unknown) => {
    const failure = toError(error);
    process.stderr.write(`${failure.stack ?? failure.message}\n`);
    process.exitCode = 1;
});
