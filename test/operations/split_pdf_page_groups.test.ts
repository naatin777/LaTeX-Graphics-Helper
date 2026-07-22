import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument } from 'pdf-lib';

import {
  isSplitPdfHostToWebviewMessage,
  isSplitPdfWebviewToHostMessage,
  parseSplitPdfPages,
  type SplitPdfLabels,
} from '../../src/application/protocols/split_pdf_protocol.js';
import { splitPdfByPageGroups } from '../../src/operations/pdf/split_pdf.js';

suite('PDFページグループ分割', () => {
  test('parses page expressions in input order with ranges and duplicates', () => {
    assert.deepEqual(parseSplitPdfPages('10, 3-5, 3, -2, 7-', 10), {
      ok: true,
      pages: [10, 3, 4, 5, 3, 1, 2, 7, 8, 9, 10],
    });
  });

  test('rejects malformed, descending, and out-of-range page expressions', () => {
    assert.equal(parseSplitPdfPages('1,,3', 3).ok, false);
    assert.equal(parseSplitPdfPages('-', 3).ok, false);
    assert.equal(parseSplitPdfPages('3-1', 3).ok, false);
    assert.equal(parseSplitPdfPages('4', 3).ok, false);
  });

  test('creates grouped PDFs in supplied order and preserves duplicate pages', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-groups-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');

    try {
      await writePdf(sourcePath, [101, 102, 103]);

      await splitPdfByPageGroups({
        jobs: [
          {
            sourcePath,
            workspacePath,
            pageGroups: [[3, 1, 3], [2]],
            outputPathForGroup: (groupIndex) => path.join(workspacePath, `group-${groupIndex + 1}.pdf`),
          },
        ],
        runId: 'run',
      });

      const firstGroup = await PDFDocument.load(await readFile(path.join(workspacePath, 'group-1.pdf')));
      const secondGroup = await PDFDocument.load(await readFile(path.join(workspacePath, 'group-2.pdf')));

      assert.deepEqual(
        firstGroup.getPages().map((page) => page.getWidth()),
        [103, 101, 103],
      );
      assert.deepEqual(
        secondGroup.getPages().map((page) => page.getWidth()),
        [102],
      );
      await access(
        path.join(workspacePath, '.latex-graphics-helper', 'split-pdf', 'run', '1-source', 'groups', '1.pdf'),
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('rejects a malformed PDF during common preflight before creating staging', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-groups-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'group.pdf');
    const stagingRootPath = path.join(workspacePath, '.latex-graphics-helper', 'split-pdf', 'run');
    const invalidPdfPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      'test',
      'fixtures',
      'preflight',
      'invalid-header.pdf',
    );

    try {
      await copyFile(invalidPdfPath, sourcePath);

      await assert.rejects(
        splitPdfByPageGroups({
          jobs: [
            {
              sourcePath,
              workspacePath,
              pageGroups: [[1]],
              outputPathForGroup: () => outputPath,
            },
          ],
          runId: 'run',
        }),
        /Preflight validation failed/,
      );

      await assert.rejects(access(outputPath));
      await assert.rejects(access(stagingRootPath));
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('rejects empty and out-of-range groups before committing output', async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), 'lgh-split-groups-test-'));
    const sourcePath = path.join(workspacePath, 'source.pdf');
    const outputPath = path.join(workspacePath, 'group.pdf');

    try {
      await writePdf(sourcePath, [101, 102]);

      await assert.rejects(
        splitPdfByPageGroups({
          jobs: [
            {
              sourcePath,
              workspacePath,
              pageGroups: [[1, 3]],
              outputPathForGroup: () => outputPath,
            },
          ],
        }),
        /out of range/,
      );
      await assert.rejects(access(outputPath));

      await assert.rejects(
        splitPdfByPageGroups({
          jobs: [
            {
              sourcePath,
              workspacePath,
              pageGroups: [[]],
              outputPathForGroup: () => outputPath,
            },
          ],
        }),
        /cannot be empty/,
      );
    } finally {
      await rm(workspacePath, { recursive: true, force: true });
    }
  });

  test('accepts only the defined protocol shapes', () => {
    const labels: SplitPdfLabels = {
      title: 'Split PDF',
      description: 'Split pages into groups.',
      preview: 'Preview',
      previewDescription: 'Preview the source PDF.',
      previewAriaLabel: 'PDF preview',
      groups: 'Groups',
      groupLabel: 'Group',
      pages: 'Pages',
      pageLabel: 'Page',
      pagesPlaceholder: '1, 3-5',
      outputName: 'Output name',
      outputNamePlaceholder: 'group-1.pdf',
      outputPath: 'Output path',
      addGroup: 'Add group',
      removeGroup: 'Remove group',
      apply: 'Apply',
      cancel: 'Cancel',
      previewRenderError: 'Could not render the PDF.',
      previewApplyError: 'Preview must finish before applying.',
      pagesRequiredError: 'Pages are required.',
      pageWholeNumberError: 'Page must be a whole number.',
      pageOutOfRangeError: 'Page is out of range.',
      allPages: 'All pages',
      focusedPages: 'Focused',
      zoom: 'Preview zoom',
      dragGroup: 'Drag group',
      moveUp: 'Move up',
      moveDown: 'Move down',
      outputOrder: 'Output order',
      invalidPages: 'Invalid pages: {0}',
      descendingPages: 'Descending pages: {0}',
      outputNameEmpty: 'Output name is empty.',
      outputNamePath: 'Output name contains a path.',
      outputNameDuplicate: 'Output name is duplicated: {0}',
    };

    assert.equal(
      isSplitPdfHostToWebviewMessage({
        type: 'init',
        payload: {
          sourceId: 'source-1',
          fileName: 'source.pdf',
          pageCount: 3,
          pdfSrc: 'vscode-resource://source.pdf',
          outputPathTemplate: 'source/__LGH_OUTPUT_NAME__.pdf',
          workerSrc: 'vscode-resource://worker.mjs',
          cMapUrl: 'vscode-resource://cmaps/',
          standardFontDataUrl: 'vscode-resource://fonts/',
          wasmUrl: 'vscode-resource://wasm/',
          labels,
        },
      }),
      true,
    );
    assert.equal(
      isSplitPdfHostToWebviewMessage({
        type: 'init',
        payload: {
          sourceId: 'source-1',
          fileName: 'source.pdf',
          pageCount: 3,
          pdfSrc: 'vscode-resource://source.pdf',
          outputPathTemplate: 'source/__LGH_OUTPUT_NAME__.pdf',
          labels,
          sourcePath: '/not-allowed',
        },
      }),
      false,
    );
    assert.equal(isSplitPdfWebviewToHostMessage({ type: 'ready' }), true);
    assert.equal(
      isSplitPdfWebviewToHostMessage({
        type: 'previewLoadFailed',
        payload: { message: 'preview failed' },
      }),
      true,
    );
    assert.equal(
      isSplitPdfHostToWebviewMessage({
        type: 'init',
        payload: {
          sourceId: 'source-1',
          fileName: 'source.pdf',
          pageCount: 3,
          pdfSrc: '/workspace/source.pdf',
          outputPathTemplate: 'source/__LGH_OUTPUT_NAME__.pdf',
          labels,
        },
      }),
      false,
    );
    assert.equal(
      isSplitPdfWebviewToHostMessage({
        type: 'apply',
        payload: { rows: [{ pages: [2, 2], outputName: 'group.pdf' }] },
      }),
      true,
    );
    assert.equal(
      isSplitPdfWebviewToHostMessage({
        type: 'apply',
        payload: { rows: [{ pages: [], outputName: 'group.pdf' }] },
      }),
      false,
    );
  });
});

async function writePdf(filePath: string, widths: readonly number[]): Promise<void> {
  const document = await PDFDocument.create();

  for (const width of widths) {
    document.addPage([width, 200]);
  }

  await writeFile(filePath, await document.save());
}
