import fs from 'node:fs';
import path from 'node:path';

const COMPLETE_MARKER = 'is-complete';

interface ProductJson {
    nameShort?: string;
    applicationName?: string;
}

interface LocalInstall {
    dir: string;
    version: number[];
}

/**
 * Resolves the Electron binary of a local VS Code installation.
 *
 * Playwright's `_electron.launch` needs the Electron executable, not the
 * `code` CLI shim. The executable name differs per platform and VS Code
 * version (>= 1.110 on macOS renamed it from `Electron` to `Code`), so the
 * name is read from the shipped `product.json`.
 */
export async function resolveVSCodeExecutable({
    explicitPath,
    repoRoot,
    log,
}: {
    explicitPath?: string;
    repoRoot: string;
    log?: (message: string) => void;
}): Promise<string> {
    if (explicitPath) {
        return assertExecutable(explicitPath, 'LGH_UI_POC_VSCODE_EXECUTABLE/--executable');
    }

    const installDir = findLocalInstall(repoRoot);
    if (installDir) {
        return executableFromInstallDir(installDir);
    }

    log?.(
        'No completed VS Code download found in .vscode-test; downloading via @vscode/test-electron (network required).',
    );

    const { downloadAndUnzipVSCode } = await import('@vscode/test-electron');
    const downloadedExecutable = await downloadAndUnzipVSCode();
    return executableFromInstallDir(installDirFromDownloadedExecutable(downloadedExecutable));
}

function findLocalInstall(repoRoot: string): string | undefined {
    const cacheDir = path.join(repoRoot, '.vscode-test');

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(cacheDir, { withFileTypes: true });
    } catch {
        return undefined;
    }

    const installs = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('vscode-'))
        .map((entry) => {
            const version = entry.name.match(/-(\d+)\.(\d+)\.(\d+)$/)?.[0].slice(1);
            return {
                dir: path.join(cacheDir, entry.name),
                version: version ? version.split('.').map(Number) : undefined,
            };
        })
        .filter((entry): entry is LocalInstall =>
            Boolean(
                entry.version &&
                fs.existsSync(path.join(entry.dir, COMPLETE_MARKER)) &&
                hasProductJson(entry.dir),
            ),
        )
        .toSorted((left, right) => compareVersions(right.version, left.version));

    return installs[0]?.dir;
}

function hasProductJson(installDir: string): boolean {
    try {
        return fs.existsSync(productJsonPath(installDir));
    } catch {
        return false;
    }
}

function productJsonPath(installDir: string): string {
    if (process.platform === 'darwin') {
        const appDir = findChildDirectory(installDir, (name) => name.endsWith('.app'));
        if (!appDir) {
            throw new Error(`Could not find a .app bundle in ${installDir}.`);
        }
        return path.join(installDir, appDir, 'Contents', 'Resources', 'app', 'product.json');
    }

    if (process.platform === 'win32') {
        const direct = path.join(installDir, 'resources', 'app', 'product.json');
        if (fs.existsSync(direct)) {
            return direct;
        }

        const nested = findChildDirectory(installDir, (name) =>
            fs.existsSync(path.join(installDir, name, 'resources', 'app', 'product.json')),
        );
        if (nested) {
            return path.join(installDir, nested, 'resources', 'app', 'product.json');
        }

        throw new Error(`Could not find product.json in ${installDir}.`);
    }

    return path.join(installDir, 'resources', 'app', 'product.json');
}

function executableFromInstallDir(installDir: string): string {
    assertDirectory(installDir, 'VS Code installation');

    if (process.platform === 'darwin') {
        const appDirName = findChildDirectory(installDir, (name) => name.endsWith('.app'));
        if (!appDirName) {
            throw new Error(`Could not find a .app bundle in ${installDir}.`);
        }

        const appDir = path.join(installDir, appDirName);
        const product = readProductJson(productJsonPath(installDir));
        return firstExecutable(
            [
                path.join(appDir, 'Contents', 'MacOS', product?.nameShort ?? 'Electron'),
                path.join(appDir, 'Contents', 'MacOS', 'Electron'),
                path.join(appDir, 'Contents', 'MacOS', 'Code'),
            ],
            installDir,
        );
    }

    if (process.platform === 'win32') {
        const productPath = productJsonPath(installDir);
        const product = readProductJson(productPath);
        const appRoot = path.resolve(productPath, '..', '..', '..');
        return firstExecutable(
            [
                path.join(appRoot, `${product?.nameShort ?? 'Code'}.exe`),
                path.join(installDir, 'Code.exe'),
            ],
            installDir,
        );
    }

    const product = readProductJson(productJsonPath(installDir));
    return firstExecutable(
        [path.join(installDir, product?.applicationName ?? 'code'), path.join(installDir, 'code')],
        installDir,
    );
}

function installDirFromDownloadedExecutable(executablePath: string): string {
    if (process.platform === 'darwin' && executablePath.includes('.app/Contents/MacOS/')) {
        // .../Visual Studio Code.app/Contents/MacOS/Electron -> .../vscode-darwin-arm64-<version>
        return path.resolve(path.dirname(executablePath), '..', '..', '..');
    }

    return path.dirname(executablePath);
}

function readProductJson(productPath: string): ProductJson | undefined {
    try {
        return JSON.parse(fs.readFileSync(productPath, 'utf8')) as ProductJson;
    } catch {
        return undefined;
    }
}

function findChildDirectory(
    parentDir: string,
    predicate: (name: string) => boolean,
): string | undefined {
    try {
        return fs
            .readdirSync(parentDir, { withFileTypes: true })
            .find((entry) => entry.isDirectory() && predicate(entry.name))?.name;
    } catch {
        return undefined;
    }
}

function firstExecutable(candidates: string[], installDir: string): string {
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        `Could not locate the Electron executable in ${installDir}. Tried:\n${candidates
            .map((candidate) => `  - ${candidate}`)
            .join('\n')}`,
    );
}

function compareVersions(left: number[], right: number[]): number {
    for (let index = 0; index < 3; index++) {
        if (left[index] !== right[index]) {
            return left[index] - right[index];
        }
    }

    return 0;
}

function assertExecutable(filePath: string, source: string): string {
    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
            throw new Error('not a file');
        }
    } catch (error) {
        throw new Error(
            `VS Code executable from ${source} is not usable: ${filePath} (${errorMessage(error)})`,
            { cause: error },
        );
    }

    return filePath;
}

function assertDirectory(directory: string, source: string): void {
    try {
        if (!fs.statSync(directory).isDirectory()) {
            throw new Error('not a directory');
        }
    } catch (error) {
        throw new Error(`${source} is not usable: ${directory} (${errorMessage(error)})`, {
            cause: error,
        });
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
