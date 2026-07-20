import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { convertEpsToPdf } from '../src/operations/convert_eps_to_pdf.js';

suite('EPSからPDFへの変換', () => {
  test('WindowsではASCII scratchのinput.epsとoutput.pdfを使う', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-to-pdf-'));
    const workspacePath = path.join(rootPath, 'workspace 日本語');
    const scratchBasePath = path.join(rootPath, 'scratch');
    const sourcePath = path.join(workspacePath, 'source 日本語.eps');
    const outputPath = path.join(workspacePath, 'output 日本語.pdf');

    await Promise.all([mkdir(workspacePath, { recursive: true }), mkdir(scratchBasePath)]);
    const realScratchBasePath = await realpath(scratchBasePath);
    await writeFile(sourcePath, '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\nshowpage\n');

    try {
      let toolArgs: string[] | undefined;
      await convertEpsToPdf({
        sourcePath,
        outputPath,
        workspacePath,
        ghostscriptPath: 'gswin64c.exe',
        platform: 'win32',
        scratchBaseCandidates: [realScratchBasePath],
        runGhostscript: async (_executable, args) => {
          toolArgs = args;
          const outputArgument = args.find((argument) => argument.startsWith('-sOutputFile='));
          assert.ok(outputArgument);
          await writeFile(outputArgument.slice('-sOutputFile='.length), 'PDF output');
          return { stdout: '', stderr: '' };
        },
      });

      assert.ok(toolArgs);
      assert.strictEqual(path.basename(toolArgs.at(-1)!), 'input.eps');
      assert.strictEqual(
        path.basename(toolArgs.find((argument) => argument.startsWith('-sOutputFile='))!.slice(13)),
        'output.pdf',
      );
      assert.strictEqual(await readFile(outputPath, 'utf8'), 'PDF output');
      await assert.rejects(access(path.dirname(toolArgs.at(-1)!)));
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });

  test('Ghostscript失敗時は論理出力を作成しない', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'lgh-eps-to-pdf-failure-'));
    const workspacePath = path.join(rootPath, 'workspace');
    const sourcePath = path.join(workspacePath, 'source.eps');
    const outputPath = path.join(workspacePath, 'output.pdf');

    await mkdir(workspacePath, { recursive: true });
    await writeFile(sourcePath, '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\nshowpage\n');

    try {
      await assert.rejects(
        convertEpsToPdf({
          sourcePath,
          outputPath,
          workspacePath,
          ghostscriptPath: 'gs',
          runGhostscript: async () => {
            throw new Error('Ghostscript failed');
          },
        }),
        /Ghostscript failed/,
      );
      await assert.rejects(access(outputPath));
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });
});
