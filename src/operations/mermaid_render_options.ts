import type { run as runMermaidCli } from '@mermaid-js/mermaid-cli';

import type { MermaidPuppeteerOptions } from './convert_png_to_pdf.js';

type MermaidCliRunOptions = NonNullable<Parameters<typeof runMermaidCli>[2]>;
type MermaidCliParseMmdOptions = NonNullable<MermaidCliRunOptions['parseMMDOptions']>;
type MermaidCliConfig = NonNullable<MermaidCliParseMmdOptions['mermaidConfig']>;

export function createMermaidCliRenderOptions(
  options: Pick<MermaidPuppeteerOptions, 'theme' | 'backgroundColor'> = {
    theme: 'default',
    backgroundColor: 'white',
  },
): Pick<MermaidCliRunOptions, 'parseMMDOptions'> {
  return {
    parseMMDOptions: {
      backgroundColor: options.backgroundColor,
      mermaidConfig: {
        // Settings intentionally remain strings so invalid values are rejected by Mermaid CLI at render time.
        theme: options.theme as NonNullable<MermaidCliConfig['theme']>,
      },
    },
  };
}
