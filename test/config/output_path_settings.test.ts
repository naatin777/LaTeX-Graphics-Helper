import assert from 'node:assert/strict';

import {
  readOutputFormatOutputTemplate,
  readOutputPathTemplate,
  type OutputPathCommand,
} from '../../src/config/output/output_path_settings.js';

function configuration(values: Record<string, unknown>) {
  return {
    get<T>(key: string, defaultValue: T): T {
      return (values[key] ?? defaultValue) as T;
    },
  };
}

suite('outputPaths設定', () => {
  test('command別のoutputPathsをflat設定より優先する', () => {
    const config = configuration({
      outputPaths: { convertToPng: 'object/${file}.png' },
      'outputPath.convertToPng': 'flat/${file}.png',
    });

    assert.strictEqual(readOutputFormatOutputTemplate(config, 'outputPath.convertToPng'), 'object/${file}.png');
  });

  test('空のobject設定は既存flat設定へfallbackする', () => {
    const config = configuration({
      outputPaths: { convertToPng: '  ' },
      'outputPath.convertToPng': 'flat/${file}.png',
    });

    assert.strictEqual(readOutputFormatOutputTemplate(config, 'outputPath.convertToPng'), 'flat/${file}.png');
  });

  test('Draw.io commandもobject設定から取得する', () => {
    const config = configuration({ outputPaths: { convertDrawioToPdf: 'drawio/${page}.pdf' } });

    assert.strictEqual(
      readOutputPathTemplate(config, 'convertDrawioToPdf', 'outputPath.convertDrawioToPdf', 'default.pdf'),
      'drawio/${page}.pdf',
    );
  });

  test('公開される各変換commandをobject設定から取得する', () => {
    const commands: OutputPathCommand[] = [
      'convertToPdf',
      'convertToPng',
      'convertToJpeg',
      'convertToWebp',
      'convertToAvif',
      'convertToSvg',
      'convertToGif',
      'convertToTiff',
      'convertToEps',
      'convertToRaw',
      'convertToDrawio',
      'convertImagesToSinglePdf',
      'convertDrawioToPdf',
      'convertDrawioToPdfDirectly',
    ];
    const values = Object.fromEntries(commands.map((command) => [command, `${command}.output`]));
    const config = configuration({ outputPaths: values });

    for (const command of commands) {
      assert.strictEqual(readOutputPathTemplate(config, command, `outputPath.${command}`, 'fallback'), values[command]);
    }
  });

  test('object設定が配列や非文字列の場合は既存fallbackを使う', () => {
    const config = configuration({
      outputPaths: ['invalid'],
      'outputPath.convertToPdf': 'legacy/${file}.pdf',
    });

    assert.strictEqual(
      readOutputPathTemplate(config, 'convertToPdf', 'outputPath.convertToPdf', 'fallback.pdf'),
      'legacy/${file}.pdf',
    );
  });
});
