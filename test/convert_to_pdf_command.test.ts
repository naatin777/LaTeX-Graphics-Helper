/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToPdf commandが登録されること
// - PNGをPDFに変換できること
// - JPEG、WebPをPDFに変換できること
// - AVIFをPDFに変換できること
// - SVGをPDFに変換できること
// - MermaidをPDFに変換できること
// - PNG、JPEG、WebP、AVIF、SVG、Mermaidを1回のコマンドでPDFへ変換できること
// - 複数PNGを1回のコマンドでPDFへ変換できること
// - 非対応入力が含まれる場合、変換全体を開始しないこと
// - 入力形式と出力形式が同じ場合、変換全体を開始しないこと
// - 出力PDFが1ページであること
// - PDFページサイズが入力画像のpixel幅・高さと同じ数値のpointになること
//
// Mocked:
// - VS Codeの通知API。通知UIの選択はここでは対象外にし、command completionを直接検証する。
//
// Not tested:
// - Draw.ioからPDFへの変換詳細
// - 画像を1つのPDFへ結合する機能
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

import { logicalSourcePathForOutputTemplate } from '../src/application/source_format.js';

import { runCommandAndClearNotificationsUntilDone } from './helpers/vscode_command.js';
import { withWorkspaceSettings } from './helpers/workspace_settings.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, '..', '..', 'test', 'fixtures', 'test.png');
const CONVERT_TO_PDF_COMMAND = 'latex-graphics-helper.convertToPdf';
const generatedImageWidth = 17;
const generatedImageHeight = 13;
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

const jpegAndWebpVariants = [
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
] as const;

const avifVariant = {
  basename: 'source-avif',
  extension: 'avif',
  imageBase64:
    'AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAAXBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAGUAAEAAAAAAAAAHQACAAAAAAGxAAEAAAAAAAAAFQAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAFWluZmUCAAAAAAIAAGF2MDEAAAAAr2lwcnAAAACKaXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAABEAAAANAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAcAAAAAA5waXhpAAAAAAEIAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAdaXBtYQAAAAAAAAACAAEDgQIDAAIEhAIFhgAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAOm1kYXQSAAoIOBDhjCAhoNIyDxgAAABAAeAHi4pg1AUBKBIACgUYEOGMKjIKGAAAAQAF04DygA==',
} as const;

const imageVariants = [
  ...jpegAndWebpVariants,
  {
    ...avifVariant,
  },
] as const;

suite('PDFに変換コマンド', () => {
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

    assert.ok(commands.includes(CONVERT_TO_PDF_COMMAND));
  });

  test('PNG、JPEG、WebP、AVIFを1つのbatchでPDFへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, 'source-png.png');
      const imagePaths = await Promise.all(
        imageVariants.map(async (variant) => {
          const sourcePath = path.join(temporaryDirectory, `${variant.basename}.${variant.extension}`);
          await writeTestImage(sourcePath, variant.imageBase64);
          return sourcePath;
        }),
      );
      await copyFile(fixturePngPath, pngPath);
      const sourcePaths = [pngPath, ...imagePaths];

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePaths[0]!),
        sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSizeMatchesImage(replaceExtension(pngPath, '.pdf'), pngPath);
      await Promise.all(
        imagePaths.map((sourcePath) =>
          assertPdfPageSize(replaceExtension(sourcePath, '.pdf'), generatedImageWidth, generatedImageHeight),
        ),
      );
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('SVGをSVGの幅と高さと同じpointサイズの1ページPDFへ変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.svg');
      await writeTestSvg(sourcePath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSize(replaceExtension(sourcePath, '.pdf'), generatedSvgWidth, generatedSvgHeight);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('.mmdファイルを読み取り可能なPDFへ変換する', async () => {
    await assertMermaidFileConvertsToPdf('source.mmd');
  });

  test('.mermaidファイルを読み取り可能なPDFへ変換する', async () => {
    await assertMermaidFileConvertsToPdf('source.mermaid');
  });

  test('outputPath.convertToPdfが設定されている場合はペア別設定より優先する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, 'source.png');
      const outputPath = path.join(temporaryDirectory, 'to-pdf-source.pdf');
      await copyFile(fixturePngPath, sourcePath);

      await withWorkspaceSettings(
        {
          'latex-graphics-helper.outputPath.convertToPdf': '${fileDirname}/to-pdf-${fileBasenameNoExtension}.pdf',
          'latex-graphics-helper.outputPath.convertPngToPdf': '${fileDirname}/pair-${fileBasenameNoExtension}.pdf',
        },
        async () => {
          await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));
        },
      );

      await assertPdfPageSizeMatchesImage(outputPath, sourcePath);
      await assertFileDoesNotExist(path.join(temporaryDirectory, 'pair-source.pdf'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('outputPath.convertToPdfが空文字の場合はペア別設定へfallbackする', async () => {
    await assertConvertToPdfOutputPathFallsBackToPairSetting('');
  });

  test('outputPath.convertToPdfが空白のみの場合はペア別設定へfallbackする', async () => {
    await assertConvertToPdfOutputPathFallsBackToPairSetting('   ');
  });

  test('outputPath.convertToPdfが未設定の場合はペア別設定へfallbackする', async () => {
    await assertConvertToPdfOutputPathFallsBackToPairSetting(undefined);
  });

  test('大文字拡張子のファイルを変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, 'raster.PNG');

      await copyFile(fixturePngPath, pngPath);

      const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(pngPath));
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSizeMatchesImage(path.join(temporaryDirectory, 'raster.pdf'), pngPath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('編集可能なDraw.io画像では出力テンプレートに論理入力パスを使う', () => {
    assert.strictEqual(
      logicalSourcePathForOutputTemplate(path.join('workspace', 'source.drawio.png')),
      path.join('workspace', 'source'),
    );
    assert.strictEqual(
      logicalSourcePathForOutputTemplate(path.join('workspace', 'diagram.DIO.SVG')),
      path.join('workspace', 'diagram'),
    );
    assert.strictEqual(
      logicalSourcePathForOutputTemplate(path.join('workspace', 'image.png')),
      path.join('workspace', 'image.png'),
    );
  });

  test('複数PNGを1つのバッチとして変換する', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const firstSourcePath = path.join(temporaryDirectory, 'first.png');
      const secondSourcePath = path.join(temporaryDirectory, 'second.png');
      await copyFile(fixturePngPath, firstSourcePath);
      await copyFile(fixturePngPath, secondSourcePath);

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(firstSourcePath), [
        vscode.Uri.file(firstSourcePath),
        vscode.Uri.file(secondSourcePath),
      ]);

      await assertPdfPageSizeMatchesImage(path.join(temporaryDirectory, 'first.pdf'), firstSourcePath);
      await assertPdfPageSizeMatchesImage(path.join(temporaryDirectory, 'second.pdf'), secondSourcePath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('非対応入力が含まれる場合はどのファイルも変換しない', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, 'source.png');
      const unsupportedPath = path.join(temporaryDirectory, 'source.txt');
      await copyFile(fixturePngPath, pngPath);
      await writeFile(unsupportedPath, 'not an image');

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(pngPath), [
        vscode.Uri.file(pngPath),
        vscode.Uri.file(unsupportedPath),
      ]);

      await assertFileDoesNotExist(path.join(temporaryDirectory, 'source.pdf'));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test('PDFからPDFへは変換しない', async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pdfPath = path.join(temporaryDirectory, 'source.pdf');
      const pdf = await PDFDocument.create();
      pdf.addPage([120, 80]);
      await writeFile(pdfPath, await pdf.save());

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(pdfPath));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function assertMermaidFileConvertsToPdf(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    await writeMermaidFixture(sourcePath);

    const commandExecution = vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadablePdfWithAtLeastOnePage(replaceExtension(sourcePath, '.pdf'));
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function assertConvertToPdfOutputPathFallsBackToPairSetting(
  convertToPdfTemplate: string | undefined,
): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, 'source.png');
    const outputPath = path.join(temporaryDirectory, 'pair-source.pdf');
    await copyFile(fixturePngPath, sourcePath);

    await withWorkspaceSettings(
      {
        'latex-graphics-helper.outputPath.convertToPdf': convertToPdfTemplate,
        'latex-graphics-helper.outputPath.convertPngToPdf': '${fileDirname}/pair-${fileBasenameNoExtension}.pdf',
      },
      async () => {
        await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));
      },
    );

    await assertPdfPageSizeMatchesImage(outputPath, sourcePath);
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(path.join(workspaceFolder.uri.fsPath, 'lgh-convert-to-pdf-'));
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

async function assertPdfPageSizeMatchesImage(pdfPath: string, imagePath: string): Promise<void> {
  const imageMetadata = await sharp(imagePath).metadata();
  assert.ok(imageMetadata.width);
  assert.ok(imageMetadata.height);

  await assertPdfPageSize(pdfPath, imageMetadata.width, imageMetadata.height);
}

async function writeTestImage(filePath: string, imageBase64: string): Promise<void> {
  await writeFile(filePath, Buffer.from(imageBase64, 'base64'));
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

async function assertReadablePdfWithAtLeastOnePage(pdfPath: string): Promise<void> {
  const pdf = await PDFDocument.load(await readFile(pdfPath));

  assert.ok(pdf.getPageCount() >= 1);
}

async function assertPdfPageSize(pdfPath: string, expectedWidth: number, expectedHeight: number): Promise<void> {
  const pdf = await PDFDocument.load(await readFile(pdfPath));
  assert.strictEqual(pdf.getPageCount(), 1);

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  assertApproximatelyEqual(width, expectedWidth, 0.01);
  assertApproximatelyEqual(height, expectedHeight, 0.01);
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}${extension}`);
}

function assertApproximatelyEqual(actual: number, expected: number, tolerance: number): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be within ${tolerance} of ${expected}`);
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(access(filePath), (error) => {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
  });
}
