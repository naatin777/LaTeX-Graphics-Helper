import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';
import { createSandbox } from 'sinon';
import * as vscode from 'vscode';

import { convertToGifCommand } from '../../src/commands/conversion/convert_to_gif.js';
import { convertToTiffCommand } from '../../src/commands/conversion/convert_to_tiff.js';

suite('GIF/TIFFに変換コマンド', () => {
  test('GIF入力の各フレームを独立TIFFへ変換する', async () => {
    await assertAnimatedInputIsSplit('gif', 'tiff', convertToTiffCommand);
  });

  test('TIFF入力の各ページを独立GIFへ変換する', async () => {
    await assertAnimatedInputIsSplit('tiff', 'gif', convertToGifCommand);
  });
});

async function assertAnimatedInputIsSplit(
  format: 'gif' | 'tiff',
  outputFormat: 'gif' | 'tiff',
  command: (uri?: vscode.Uri, uris?: vscode.Uri[]) => Promise<void>,
): Promise<void> {
  const workspacePath = await mkdtemp(
    path.join(vscode.workspace.workspaceFolders![0]!.uri.fsPath, `lgh-${format}-command-`),
  );
  const configuration = vscode.workspace.getConfiguration('latex-graphics-helper');
  const sandbox = createSandbox();
  const key = `outputPath.convertTo${outputFormat === 'gif' ? 'Gif' : 'Tiff'}`;
  const template = `\${fileDirname}/\${fileBasenameNoExtension}-\${page}.${outputFormat}`;

  try {
    sandbox.stub(vscode.window, 'showInformationMessage').resolves(undefined);
    sandbox.stub(vscode.window, 'showErrorMessage').resolves(undefined);
    const sourcePath = path.join(workspacePath, `source.${format}`);
    await writeAnimatedImage(sourcePath, format);
    await configuration.update(key, template, vscode.ConfigurationTarget.Workspace);
    await command(vscode.Uri.file(sourcePath));

    for (const page of [1, 2]) {
      const outputPath = path.join(workspacePath, `source-${page}.${outputFormat}`);
      const metadata = await sharp(await readFile(outputPath)).metadata();
      assert.strictEqual(metadata.format, outputFormat);
      assert.strictEqual(metadata.pages ?? 1, 1);
    }
  } finally {
    sandbox.restore();
    await configuration.update(key, undefined, vscode.ConfigurationTarget.Workspace);
    await rm(workspacePath, { recursive: true, force: true });
  }
}

async function writeAnimatedImage(filePath: string, format: 'gif' | 'tiff'): Promise<void> {
  const frames = await Promise.all([
    sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } })
      .png()
      .toBuffer(),
    sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } })
      .png()
      .toBuffer(),
  ]);
  const output = sharp(frames, { join: { animated: true } });
  await (format === 'gif' ? output.gif() : output.tiff()).toFile(filePath);
}
