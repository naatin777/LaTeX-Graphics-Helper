// Test target:
// - latex-graphics-helper.convertToPng commandが登録されること
// - MermaidをPNGに直接変換できること
// - JPEG、WebP、AVIFをPNGに変換できること
// - GIF、TIFFを全frame/pageへPNGに分割できること
// - SVGをPNGに変換できること
// - PDFをページごとのPNGに変換できること
// - PNGからPNGへは変換しないこと
// - 出力PNGが壊れておらず、幅と高さが0より大きいこと
//
// Not tested:
// - Draw.io → PDF → PNGの実変換経路
//   - fake Draw.io CLIをcommand testで直接扱うとWindowsのexecFile差で不安定になりやすい。
//   - 0065の実装時にrunnerを注入できるoperation testとして固定する。
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
import sharp from 'sharp';
import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { CONVERT_TO_PNG_COMMAND } from '../../src/commands/conversion/convert_to_png.js';

import { runCommandAndClearNotificationsUntilDone } from '../helpers/vscode_command.js';
import { withWorkspaceSettings } from '../helpers/workspace_settings.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, '..', '..', '..', 'test', 'fixtures', 'test.png');
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

const imageVariants = [
  {
    basename: 'source-jpeg',
    extension: 'jpeg',
    imageBase64:
      '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAANABEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCbAL6KAA//2Q==',
  },
  {
    basename: 'source-webp',
    extension: 'webp',
    imageBase64: 'UklGRkAAAABXRUJQVlA4IDQAAADQAgCdASoRAA0APm0skkWkIqGYBABABsSxgDsAAIGwAP7w+iv/ySPVzHQf/oUbKJpMAAAA',
  },
  {
    basename: 'source-avif',
    extension: 'avif',
    imageBase64:
      'AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAAXBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAGUAAEAAAAAAAAAHQACAAAAAAGxAAEAAAAAAAAAFQAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAFWluZmUCAAAAAAIAAGF2MDEAAAAAr2lwcnAAAACKaXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAABEAAAANAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAcAAAAAA5waXhpAAAAAAEIAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAdaXBtYQAAAAAAAAACAAEDgQIDAAIEhAIFhgAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAOm1kYXQSAAoIOBDhjCAhoNIyDxgAAABAAeAHi4pg1AUBKBIACgUYEOGMKjIKGAAAAQAF04DygA==',
  },
] as const;

suite('PNGに変換コマンド', () => {
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

    assert.ok(commands.includes(CONVERT_TO_PNG_COMMAND));
  });

  test('JPEG、WebP、AVIF、PDFを1つのbatchでPNGへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const imagePaths = await Promise.all(
        imageVariants.map(async (variant) => {
          const sourcePath = path.join(temporaryDirectory, `${variant.basename}.${variant.extension}`);
          await writeFile(sourcePath, Buffer.from(variant.imageBase64, 'base64'));
          return sourcePath;
        }),
      );
      const pdfPath = path.join(temporaryDirectory, 'source-document.pdf');
      await writeTwoPagePdf(pdfPath);
      const sourcePaths = [...imagePaths, pdfPath];

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PNG_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await Promise.all(imagePaths.map((sourcePath) => assertReadablePng(replaceExtension(sourcePath, '.png'))));
      await assertReadablePng(path.join(temporaryDirectory, 'source-document-1.png'));
      await assertReadablePng(path.join(temporaryDirectory, 'source-document-2.png'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('GIFとTIFFを全pageからPNGへ分割する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePaths = await Promise.all(
        ['gif', 'tiff'].map(async (extension) => {
          const sourcePath = path.join(temporaryDirectory, `source-${extension}.${extension}`);
          const format = extension as 'gif' | 'tiff';
          await writeAnimatedImageFixture(sourcePath, format);
          return sourcePath;
        }),
      );

      await withWorkspaceSettings(
        { 'latex-graphics-helper.outputPath.convertToPng': '${fileDirname}/${fileBasenameNoExtension}-${page}.png' },
        async () => {
          const commandExecution = vscode.commands.executeCommand(
            CONVERT_TO_PNG_COMMAND,
            vscode.Uri.file(sourcePaths[0]!),
            sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
          );
          await runCommandAndClearNotificationsUntilDone(commandExecution);
        },
      );

      await Promise.all(
        sourcePaths.flatMap((sourcePath) => [1, 2].map((page) => assertReadablePng(framePath(sourcePath, page)))),
      );
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('SVGを読み取り可能なPNGへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.svg');
      await writeTestSvg(sourcePath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PNG_COMMAND, vscode.Uri.file(sourcePath));
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadablePng(replaceExtension(sourcePath, '.png'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('.mmdファイルを読み取り可能なPNGへ変換する', async () => {
    await assertMermaidFileConvertsToPng('source.mmd');
  });

  test('.mermaidファイルを読み取り可能なPNGへ変換する', async () => {
    await assertMermaidFileConvertsToPng('source.mermaid');
  });

  test('mermaid.backgroundColor=transparentのPNG出力を透過にする', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'transparent-background.mmd');
      await writeMermaidFixture(sourcePath);

      await withWorkspaceSettings({ 'latex-graphics-helper.mermaid.backgroundColor': 'transparent' }, async () => {
        const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PNG_COMMAND, vscode.Uri.file(sourcePath));
        await runCommandAndClearNotificationsUntilDone(commandExecution);
      });

      const outputPath = replaceExtension(sourcePath, '.png');
      const metadataBuffer = await readFile(outputPath);
      const metadata = await sharp(metadataBuffer).metadata();
      assert.strictEqual(metadata.hasAlpha, true);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('outputPath.convertToPngが設定されている場合はペア別設定より優先してpageを展開する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.pdf');
      const firstOutputPath = path.join(temporaryDirectory, 'to-png-source-1.png');
      const secondOutputPath = path.join(temporaryDirectory, 'to-png-source-2.png');
      await writeTwoPagePdf(sourcePath);

      await withWorkspaceSettings(
        {
          'latex-graphics-helper.outputPath.convertToPng':
            '${fileDirname}/to-png-${fileBasenameNoExtension}-${page}.png',
          'latex-graphics-helper.outputPath.convertPdfToPng':
            '${fileDirname}/pair-${fileBasenameNoExtension}-${page}.png',
        },
        async () => {
          const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PNG_COMMAND, vscode.Uri.file(sourcePath));
          await runCommandAndClearNotificationsUntilDone(commandExecution);
        },
      );

      await assertReadablePng(firstOutputPath);
      await assertReadablePng(secondOutputPath);
      await assertFileDoesNotExist(path.join(temporaryDirectory, 'pair-source-1.png'));
      await assertFileDoesNotExist(path.join(temporaryDirectory, 'pair-source-2.png'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('PNGからPNGへは変換しない', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, 'source.png');
      await copyFile(fixturePngPath, pngPath);

      await vscode.commands.executeCommand(CONVERT_TO_PNG_COMMAND, vscode.Uri.file(pngPath));

      await assertFileDoesNotExist(path.join(temporaryDirectory, 'source-1.png'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function assertMermaidFileConvertsToPng(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    await writeMermaidFixture(sourcePath);

    const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PNG_COMMAND, vscode.Uri.file(sourcePath));
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadablePng(replaceExtension(sourcePath, '.png'));
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function writeMermaidFixture(filePath: string): Promise<void> {
  await writeFile(filePath, ['flowchart LR', '  A[Mermaid Alpha] --> B[Mermaid Beta]', ''].join('\n'));
}

async function writeAnimatedImageFixture(filePath: string, format: 'gif' | 'tiff'): Promise<void> {
  const red = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const blue = await sharp({
    create: {
      width: 4,
      height: 4,
      channels: 4,
      background: { r: 0, g: 0, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const output = sharp([red, blue], { join: { animated: true } });
  await (format === 'gif' ? output.gif() : output.tiff()).toFile(filePath);
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-convert-to-png-'));
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

async function assertReadablePng(filePath: string): Promise<void> {
  const imageBuffer = await readFile(filePath);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  assert.strictEqual(metadata.format, 'png');
  assert.ok(metadata.width);
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height);
  assert.ok(metadata.height > 0);
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${extension}`);
}

function framePath(filePath: string, page: number): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}-${String(page).padStart(1, '0')}.png`,
  );
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(access(filePath), (error) => {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  });
}
