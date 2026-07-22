import assert from 'node:assert/strict';

import {
  readMermaidPuppeteerOptions,
  readPuppeteerExecutablePath,
  type MermaidConfiguration,
} from '../../src/config/rendering/mermaid_puppeteer_options.js';

suite('Mermaid Puppeteer settings', () => {
  test('uses the legacy output-specific settings when the common settings are unset', () => {
    const options = readMermaidPuppeteerOptions(
      fakeConfiguration({
        'convertToSvg.mermaid.puppeteer.browserChannel': 'chrome-beta',
        'convertToSvg.mermaid.puppeteer.executablePath': '/legacy/chrome',
      }),
      'convertToSvg',
    );

    assert.deepEqual(options, {
      browserChannel: 'chrome-beta',
      executablePath: '/legacy/chrome',
      theme: 'default',
      backgroundColor: 'white',
    });
  });

  test('uses common settings even when a value intentionally clears the legacy setting', () => {
    const options = readMermaidPuppeteerOptions(
      fakeConfiguration({
        'mermaid.puppeteer.browserChannel': 'chrome-dev',
        'puppeteer.executablePath': '',
        'convertToPdf.mermaid.puppeteer.browserChannel': 'chrome-canary',
        'convertToPdf.mermaid.puppeteer.executablePath': '/legacy/chrome',
      }),
      'convertToPdf',
    );

    assert.deepEqual(options, {
      browserChannel: 'chrome-dev',
      theme: 'default',
      backgroundColor: 'white',
    });
  });

  test('shares the common executable path with SVG conversion', () => {
    const executablePath = readPuppeteerExecutablePath(
      fakeConfiguration({
        'puppeteer.executablePath': '/shared/chrome',
        'convertToPdf.svg.puppeteer.executablePath': '/legacy/chrome',
      }),
      'convertToPdf.svg.puppeteer.executablePath',
    );

    assert.strictEqual(executablePath, '/shared/chrome');
  });
});

function fakeConfiguration(values: Record<string, string>): MermaidConfiguration {
  return {
    get<T>(key: string, defaultValue: T): T {
      return (key in values ? values[key] : defaultValue) as T;
    },
    inspect<T>(key: string) {
      return key in values ? { workspaceValue: values[key] as T } : {};
    },
  };
}
