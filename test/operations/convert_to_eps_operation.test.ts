import assert from 'node:assert/strict';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

import { convertToEpsFiles } from '../../src/operations/conversion/convert_to_eps.js';

suite('Convert to EPS operation', () => {
  test('stages and commits one EPS per PDF page', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-eps-'));
    const sourcePath = path.join(root, 'source.pdf');
    const outputPaths = [path.join(root, 'source-1.eps'), path.join(root, 'source-2.eps')];

    try {
      const document = await PDFDocument.create();
      document.addPage([100, 80]);
      document.addPage([120, 90]);
      await writeFile(sourcePath, await document.save());
      const calls: string[][] = [];
      const outputs = await convertToEpsFiles({
        jobs: outputPaths.map((outputPath, index) => ({
          sourcePath,
          outputPath,
          workspacePath: root,
          page: index + 1,
        })),
        runtime: { signal: new AbortController().signal },
        ghostscriptPath: 'gs',
        runGhostscript: async (_executable, args) => {
          calls.push(args);
          const outputArg = args.find((arg) => arg.startsWith('-sOutputFile='));
          assert.ok(outputArg);
          await writeFile(
            outputArg.slice('-sOutputFile='.length),
            '%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 80\n',
          );
        },
      });

      assert.deepStrictEqual(
        outputs.map((output) => output.outputPath),
        outputPaths,
      );
      assert.deepStrictEqual(
        calls
          .map((args) => args.find((arg) => arg.startsWith('-dFirstPage=')))
          .sort((first, second) => first!.localeCompare(second!)),
        ['-dFirstPage=1', '-dFirstPage=2'],
      );
      await Promise.all(outputPaths.map((outputPath) => access(outputPath)));
      await access(path.join(root, '.latex-graphics-helper', 'convert-to-eps'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('does not commit when Ghostscript fails', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lgh-convert-to-eps-failure-'));
    const sourcePath = path.join(root, 'source.pdf');
    const outputPath = path.join(root, 'source.eps');

    try {
      const document = await PDFDocument.create();
      document.addPage([100, 80]);
      await writeFile(sourcePath, await document.save());
      await assert.rejects(
        convertToEpsFiles({
          jobs: [{ sourcePath, outputPath, workspacePath: root }],
          runtime: { signal: new AbortController().signal },
          ghostscriptPath: 'gs',
          runGhostscript: async () => {
            throw new Error('Ghostscript failed');
          },
        }),
        /Ghostscript failed/u,
      );
      await assert.rejects(access(outputPath));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
