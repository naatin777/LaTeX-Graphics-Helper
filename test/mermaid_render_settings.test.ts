/* oxlint-disable vitest/expect-expect */

import assert from 'node:assert/strict';

import { readMermaidPuppeteerOptions, type MermaidConfiguration } from '../src/config/mermaid_puppeteer_options.js';

suite('Mermaid theme and backgroundColor settings', () => {
  test('defaults to theme=default and backgroundColor=white', () => {
    const options = readMermaidPuppeteerOptions(fakeConfiguration({}), 'convertToPdf');
    assert.strictEqual(options.theme, 'default');
    assert.strictEqual(options.backgroundColor, 'white');
  });

  test('reads custom theme from mermaid.theme', () => {
    const options = readMermaidPuppeteerOptions(fakeConfiguration({ 'mermaid.theme': 'dark' }), 'convertToPdf');
    assert.strictEqual(options.theme, 'dark');
  });

  test('reads custom backgroundColor from mermaid.backgroundColor', () => {
    const options = readMermaidPuppeteerOptions(
      fakeConfiguration({ 'mermaid.backgroundColor': 'transparent' }),
      'convertToPdf',
    );
    assert.strictEqual(options.backgroundColor, 'transparent');
  });

  test('theme and backgroundColor are included alongside executablePath', () => {
    const options = readMermaidPuppeteerOptions(
      fakeConfiguration({
        'puppeteer.executablePath': '/usr/bin/chrome',
        'mermaid.theme': 'forest',
      }),
      'convertToSvg',
    );
    assert.strictEqual(options.theme, 'forest');
    assert.strictEqual(options.backgroundColor, 'white');
    assert.strictEqual(options.executablePath, '/usr/bin/chrome');
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
