// Test target:
// - latex-graphics-helper.convertToJpeg commandが登録されること
// - PNGをJPEGへ変換できること
// - WebP、AVIFをJPEGへ変換できること
// - SVGをJPEGへ変換できること
// - PDFをページごとのJPEGへ変換できること
// - MermaidをJPEGへ変換できること
// - 出力JPEGが壊れておらず、幅と高さが0より大きいこと
//
// Not tested:
// - Draw.io → PDF → JPEGの実変換経路
//   - fake Draw.io CLIをcommand testで直接扱うとWindowsのexecFile差で不安定になりやすい。
//   - 必要になったらrunnerを注入できるoperation testとして固定する。
// - 画像内容のpixel完全一致
// - context menuの画面上の表示
// - Safe Modeダイアログの画面表示
// - VS Codeのprogress notificationの画面表示
// - cancellation tokenのUI操作

import assert from 'node:assert/strict';
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import { CONVERT_TO_JPEG_COMMAND } from '../../src/commands/conversion/convert_to_jpeg.js';
import sharp from 'sharp';
import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { runCommandAndClearNotificationsUntilDone } from '../helpers/vscode_command.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'test.png');
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

suite('JPEGに変換コマンド', () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = createSandbox();
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test('コマンドが登録されている', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_JPEG_COMMAND));
  });

  test('PNG、WebP、AVIF、PDFを1つのbatchでJPEGへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, 'source-png.png');
      const webpPath = path.join(temporaryDirectory, 'source-webp.webp');
      const avifPath = path.join(temporaryDirectory, 'source-avif.avif');
      const pdfPath = path.join(temporaryDirectory, 'source-document.pdf');
      await Promise.all([
        copyFile(fixturePngPath, pngPath),
        writeImageFixture(webpPath, 'webp'),
        writeImageFixture(avifPath, 'avif'),
        writeTwoPagePdf(pdfPath),
      ]);
      const sourcePaths = [pngPath, webpPath, avifPath, pdfPath];

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_JPEG_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await Promise.all(
        [pngPath, webpPath, avifPath].map((sourcePath) => assertReadableJpeg(replaceExtension(sourcePath, '.jpeg'))),
      );
      await assertReadableJpeg(path.join(temporaryDirectory, 'source-document-1.jpeg'));
      await assertReadableJpeg(path.join(temporaryDirectory, 'source-document-2.jpeg'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('SVGを読み取り可能なJPEGへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.svg');
      await writeTestSvg(sourcePath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(CONVERT_TO_JPEG_COMMAND, vscode.Uri.file(sourcePath));
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadableJpeg(replaceExtension(sourcePath, '.jpeg'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('.mmdファイルを読み取り可能なJPEGへ変換する', async () => {
    await assertMermaidFileConvertsToJpeg('source.mmd');
  });

  test('.mermaidファイルを読み取り可能なJPEGへ変換する', async () => {
    await assertMermaidFileConvertsToJpeg('source.mermaid');
  });
});

async function assertMermaidFileConvertsToJpeg(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    await writeMermaidFixture(sourcePath);

    const commandExecution = vscode.commands.executeCommand(CONVERT_TO_JPEG_COMMAND, vscode.Uri.file(sourcePath));
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadableJpeg(replaceExtension(sourcePath, '.jpeg'));
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-convert-to-jpeg-'));
  await mkdir(temporaryDirectory, { recursive: true });
  return temporaryDirectory;
}

async function removeTemporaryDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

async function writeMermaidFixture(filePath: string): Promise<void> {
  await writeFile(filePath, ['flowchart LR', '  A[Mermaid Alpha] --> B[Mermaid Beta]', ''].join('\n'));
}

async function writeTestSvg(filePath: string, width: number, height: number): Promise<void> {
  await writeFile(
    filePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#285078"/></svg>`,
  );
}

async function writeTwoPagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage([72, 36]);
  document.addPage([36, 72]);
  await writeFile(filePath, await document.save());
}

async function writeImageFixture(filePath: string, extension: string): Promise<void> {
  const fixtureBuffer = await readFile(fixturePngPath);
  const image = sharp(fixtureBuffer);

  if (extension === 'webp') {
    await image.webp().toFile(filePath);
    return;
  }

  if (extension === 'avif') {
    await image.avif({ effort: 0 }).toFile(filePath);
    return;
  }

  throw new Error(`Unsupported generated fixture extension: ${extension}`);
}

async function assertReadableJpeg(filePath: string): Promise<void> {
  await assertFileExists(filePath);
  const buffer = await readFile(filePath);
  const image = sharp(buffer);
  const metadata = await image.metadata();

  assert.strictEqual(metadata.format, 'jpeg');
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}

async function assertFileExists(filePath: string): Promise<void> {
  await assert.doesNotReject(access(filePath));
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${extension}`);
}
