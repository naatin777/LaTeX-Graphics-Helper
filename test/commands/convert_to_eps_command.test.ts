import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';
import * as vscode from 'vscode';

import { createEpsJobs } from '../../src/commands/conversion/convert_to_eps.js';

suite('Convert to EPS command jobs', () => {
  test('creates a separate ${page} job for every PDF page', async () => {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspace);
    const root = await mkdtemp(path.join(workspace.uri.fsPath, 'lgh-convert-to-eps-command-'));
    const sourcePath = path.join(root, 'source.pdf');

    try {
      await mkdir(root, { recursive: true });
      const document = await PDFDocument.create();
      document.addPage([100, 80]);
      document.addPage([100, 80]);
      await writeFile(sourcePath, await document.save());
      const configuration = {
        get<T>(_key: string, defaultValue: T): T {
          return defaultValue;
        },
      } as vscode.WorkspaceConfiguration;
      const jobs = await createEpsJobs(vscode.Uri.file(sourcePath), configuration);

      assert.deepStrictEqual(
        jobs.map((job) => job.page),
        [1, 2],
      );
      assert.deepStrictEqual(
        jobs.map((job) => path.basename(job.outputPath)),
        ['source-1.eps', 'source-2.eps'],
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
