import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { convertEpsToPdf, validateEpsInput } from '../../src/operations/conversion/eps_to_pdf.js';

suite('EPS conversion contract', () => {
  test('rejects a missing BoundingBox but allows deferred and large valid coordinates', async () => {
    const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-contract-bbox-'));
    const missingPath = path.join(testRootPath, 'missing.eps');
    const atendPath = path.join(testRootPath, 'atend.eps');
    const largePath = path.join(testRootPath, 'large.eps');

    try {
      await writeFile(missingPath, '%!PS-Adobe-3.0 EPSF-3.0\n%%EndComments\n');
      await writeFile(atendPath, '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: (atend)\n%%EndComments\n');
      await writeFile(
        largePath,
        '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: -1000000000000 -1000000000000 1000000000000 1000000000000\n%%EndComments\n',
      );

      await assert.rejects(validateEpsInput(missingPath), /Missing BoundingBox/u);
      await assert.doesNotReject(validateEpsInput(atendPath));
      await assert.doesNotReject(validateEpsInput(largePath));
    } finally {
      await rm(testRootPath, { recursive: true, force: true });
    }
  });

  test('parses the generated PDF and requires exactly one page with positive finite boxes', async () => {
    const paths = await prepareWorkspace();

    try {
      await convertWithPdf(paths, async () => createPdfBytes(1));
      await assert.rejects(
        convertWithPdf(paths, async () => createPdfBytes(2)),
        /exactly one PDF page/u,
      );

      await assert.rejects(
        convertWithPdf(paths, async () => {
          const document = await PDFDocument.create();
          const page = document.addPage([100, 100]);
          page.setMediaBox(0, 0, 0, 100);
          return document.save();
        }),
        /invalid MediaBox dimensions/u,
      );

      await assert.rejects(
        convertWithPdf(paths, async () => Buffer.from('%PDF-1.7\nnot a PDF')),
        /unparsable PDF/u,
      );
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('uses ASCII scratch input and output on Windows, then cleans successful scratch', async () => {
    const paths = await prepareWorkspace();
    const logs: string[] = [];
    let toolInputPath: string | undefined;
    let toolOutputPath: string | undefined;

    try {
      const sourceBytes = await readFile(paths.sourcePath);
      const result = await convertEpsToPdf({
        epsPath: paths.sourcePath,
        workspacePath: paths.workspacePath,
        ghostscriptPath: 'gs',
        stagingDirectory: paths.stagingDirectory,
        platform: 'win32',
        scratchBaseCandidates: [paths.scratchBasePath],
        outputChannel: { appendLine: (message) => logs.push(message) },
        runGhostscript: async (_executable, args) => {
          toolInputPath = args.at(-1);
          toolOutputPath = outputPathFromArgs(args);
          assertScratchToolPath(toolInputPath, paths, 'source.eps');
          assertScratchToolPath(toolOutputPath, paths, 'output.pdf');
          assert.deepStrictEqual(await readFile(toolInputPath), sourceBytes);
          await writeFile(toolOutputPath, await createPdfBytes(1));
        },
      });

      assert.strictEqual(result.pdfPath, path.join(paths.stagingDirectory, 'eps-result.pdf'));
      await access(result.pdfPath);
      assert.ok(logs.some((message) => message.includes('[scratch] staged output:')));
      assert.strictEqual((await readdir(paths.scratchBasePath)).length, 0);
    } finally {
      await rm(paths.testRootPath, { recursive: true, force: true });
    }
  });

  test('retains failed and cancelled Windows scratch for diagnostics', async () => {
    const failedPaths = await prepareWorkspace();
    const failedLogs: string[] = [];
    let failedToolInputPath: string | undefined;

    try {
      await assert.rejects(
        convertEpsToPdf({
          ...conversionOptions(failedPaths),
          platform: 'win32',
          scratchBaseCandidates: [failedPaths.scratchBasePath],
          outputChannel: { appendLine: (message) => failedLogs.push(message) },
          runGhostscript: async (_executable, args) => {
            failedToolInputPath = args.at(-1);
            throw new Error('Ghostscript failed');
          },
        }),
        /Ghostscript failed/u,
      );

      assert.ok(failedToolInputPath);
      await access(path.dirname(failedToolInputPath));
      await assert.rejects(access(path.join(failedPaths.stagingDirectory, 'eps-result.pdf')));
      assert.ok(failedLogs.some((message) => message.includes('retained after failure or cancellation')));
    } finally {
      await rm(failedPaths.testRootPath, { recursive: true, force: true });
    }

    const cancelledPaths = await prepareWorkspace();
    const abortController = new AbortController();
    const cancelledLogs: string[] = [];
    let cancelledToolInputPath: string | undefined;

    try {
      await assert.rejects(
        convertEpsToPdf({
          ...conversionOptions(cancelledPaths),
          platform: 'win32',
          scratchBaseCandidates: [cancelledPaths.scratchBasePath],
          signal: abortController.signal,
          outputChannel: { appendLine: (message) => cancelledLogs.push(message) },
          runGhostscript: async (_executable, args, _timeout, signal) => {
            cancelledToolInputPath = args.at(-1);
            abortController.abort();
            signal?.throwIfAborted();
          },
        }),
        { name: 'AbortError' },
      );

      assert.ok(cancelledToolInputPath);
      await access(path.dirname(cancelledToolInputPath));
      await assert.rejects(access(path.join(cancelledPaths.stagingDirectory, 'eps-result.pdf')));
      assert.ok(cancelledLogs.some((message) => message.includes('retained after failure or cancellation')));
    } finally {
      await rm(cancelledPaths.testRootPath, { recursive: true, force: true });
    }
  });
});

interface TestPaths {
  testRootPath: string;
  workspacePath: string;
  sourcePath: string;
  stagingDirectory: string;
  scratchBasePath: string;
}

async function prepareWorkspace(): Promise<TestPaths> {
  const testRootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-contract-'));
  const workspacePath = path.join(testRootPath, 'workspace 日本語 हिन्दी 🌹');
  const sourcePath = path.join(workspacePath, '入力 日本語.eps');
  const stagingDirectory = path.join(workspacePath, 'staging output');
  const scratchBasePath = path.join(testRootPath, 'scratch');

  await mkdir(workspacePath, { recursive: true });
  await mkdir(scratchBasePath, { recursive: true });
  await writeFile(
    sourcePath,
    '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 100\n%%EndComments\nnewpath 0 0 moveto 100 100 lineto stroke\n',
  );

  return {
    testRootPath,
    workspacePath,
    sourcePath,
    stagingDirectory,
    scratchBasePath: await realpath(scratchBasePath),
  };
}

function conversionOptions(paths: TestPaths) {
  return {
    epsPath: paths.sourcePath,
    workspacePath: paths.workspacePath,
    ghostscriptPath: 'gs',
    stagingDirectory: paths.stagingDirectory,
  };
}

async function convertWithPdf(paths: TestPaths, createPdf: () => Promise<Uint8Array>) {
  return convertEpsToPdf({
    ...conversionOptions(paths),
    platform: 'linux',
    runGhostscript: async (_executable, args) => {
      await writeFile(outputPathFromArgs(args), await createPdf());
    },
  });
}

async function createPdfBytes(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();

  for (let index = 0; index < pageCount; index += 1) {
    document.addPage([100, 80]);
  }

  return document.save();
}

function outputPathFromArgs(args: readonly string[]): string {
  const outputArg = args.find((arg) => arg.startsWith('-sOutputFile='));
  assert.ok(outputArg);
  return outputArg.slice('-sOutputFile='.length);
}

function assertScratchToolPath(
  filePath: string | undefined,
  paths: TestPaths,
  expectedBaseName: string,
): asserts filePath is string {
  assert.ok(filePath);
  assert.strictEqual(path.basename(filePath), expectedBaseName);
  assert.match(filePath, /^[\x20-\x7e]+$/u);
  assert.strictEqual(isPathInside(paths.scratchBasePath, filePath), true);
  assert.strictEqual(isPathInside(paths.workspacePath, filePath), false);
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return (
    relativePath === '' ||
    (!path.isAbsolute(relativePath) && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`))
  );
}
