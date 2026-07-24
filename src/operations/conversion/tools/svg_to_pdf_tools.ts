import type { ChromeReleaseChannel, SupportedBrowser } from 'puppeteer-core';
import type { RunRsvgConvert } from '../../external_tools/run_rsvg_convert_with_ascii_scratch.js';

export type SvgToPdfEngine = 'puppeteer' | 'rsvg-convert';

export interface SvgToPdfTools {
  engine: SvgToPdfEngine;
  rsvgConvertPath: string;
  puppeteerBrowser: SupportedBrowser;
  puppeteerBrowserChannel: ChromeReleaseChannel;
  puppeteerExecutablePath?: string;
  runRsvgConvert?: RunRsvgConvert;
}
