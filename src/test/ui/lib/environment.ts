import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument, rgb } from 'pdf-lib';

export const SAMPLE_FILE_NAME = 'sample.pdf';

const SAMPLE_PAGE_SIZES: [number, number][] = [
    [200, 100],
    [300, 150],
];

export interface IsolatedEnvironment {
    profileRoot: string;
    userDataDir: string;
    extensionsDir: string;
    workspaceDir: string;
    artifactsDir: string;
    logsDir: string;
    crashesDir: string;
    inputPath: string;
    outputDir: string;
    pageSizes: [number, number][];
    expectedOutputPaths: string[];
}

export function createRunId(date = new Date()): string {
    return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

export function defaultArtifactsRoot(repoRoot: string): string {
    // .vscode-test/ is ignored by git and is already used by the vscode-test runner.
    return path.join(repoRoot, '.vscode-test', 'ui-poc');
}

/**
 * Creates a throw-away VS Code profile. Nothing is written to the developer's
 * real user-data or extension directories.
 */
export async function prepareIsolatedEnvironment({
    artifactsRoot,
    runId,
}: {
    artifactsRoot: string;
    runId: string;
}): Promise<IsolatedEnvironment> {
    const profileRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lgh-'));
    const artifactsDir = path.join(artifactsRoot, runId);
    const expectedOutputPaths = SAMPLE_PAGE_SIZES.map((_, index) =>
        path.join(profileRoot, 'workspace', 'split', `sample-${index + 1}.pdf`),
    );
    const environment: IsolatedEnvironment = {
        profileRoot,
        userDataDir: path.join(profileRoot, 'user-data'),
        extensionsDir: path.join(profileRoot, 'extensions'),
        workspaceDir: path.join(profileRoot, 'workspace'),
        artifactsDir,
        logsDir: path.join(artifactsDir, 'vscode-logs'),
        crashesDir: path.join(artifactsDir, 'crashes'),
        inputPath: path.join(profileRoot, 'workspace', SAMPLE_FILE_NAME),
        outputDir: path.join(profileRoot, 'workspace', 'split'),
        pageSizes: SAMPLE_PAGE_SIZES,
        expectedOutputPaths,
    };

    for (const directory of [
        environment.userDataDir,
        environment.extensionsDir,
        environment.workspaceDir,
        environment.artifactsDir,
        environment.logsDir,
        environment.crashesDir,
    ]) {
        await fs.mkdir(directory, { recursive: true });
    }
    await fs.mkdir(path.join(environment.userDataDir, 'User'), { recursive: true });
    await fs.writeFile(
        path.join(environment.userDataDir, 'User', 'settings.json'),
        JSON.stringify({ 'window.menuStyle': 'custom' }),
    );

    await writeSamplePdf(environment.inputPath);
    await writeWorkspaceSettings(environment.workspaceDir);

    return environment;
}

export async function removeIsolatedEnvironment(
    environment: { profileRoot?: string } | undefined,
): Promise<void> {
    if (!environment?.profileRoot) {
        return;
    }

    await fs.rm(environment.profileRoot, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
    });
}

export async function sha256File(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    hash.update(await fs.readFile(filePath));
    return hash.digest('hex');
}

async function writeSamplePdf(filePath: string): Promise<void> {
    const document = await PDFDocument.create();

    for (const [index, [width, height]] of SAMPLE_PAGE_SIZES.entries()) {
        const page = document.addPage([width, height]);
        page.drawText(`Page ${index + 1}`, {
            x: 20,
            y: height - 30,
            size: 16,
            color: rgb(0, 0, 0),
        });
    }

    await fs.writeFile(filePath, await document.save({ useObjectStreams: false }));
}

async function writeWorkspaceSettings(workspaceDir: string): Promise<void> {
    const settings = {
        // Keep all generated files inside the isolated workspace.
        'latex-graphics-helper.outputPath.splitPdf':
            '${fileDirname}/split/${fileBasenameNoExtension}-${page}.pdf',
    };

    await fs.mkdir(path.join(workspaceDir, '.vscode'), { recursive: true });
    await fs.writeFile(
        path.join(workspaceDir, '.vscode', 'settings.json'),
        `${JSON.stringify(settings, undefined, 4)}\n`,
    );
}
