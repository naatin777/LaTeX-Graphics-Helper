import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { run as runMermaidCli } from "@mermaid-js/mermaid-cli";
import pLimit from "p-limit";
import { PDFDocument, type PDFPage } from "pdf-lib";
import { launch, type Browser, type ChromeReleaseChannel } from "puppeteer-core";
import sharp from "sharp";

import {
  assertExistingPathInWorkspace,
  assertWritablePathInWorkspace,
} from "../security/workspace_path.js";
import {
  commitConversionOutputs,
  type CommittedConversionOutput,
  type OutputConflictDecision,
  type PreparedConversionOutput,
} from "./commit_conversion_outputs.js";

const CONVERSION_CONCURRENCY = 2;
const DEFAULT_SUPPORTED_IMAGE_EXTENSIONS = [".png"] as const;
const SVG_EXTENSION = ".svg";
const MERMAID_EXTENSIONS = [".mmd", ".mermaid"] as const;
const execFileAsync = promisify(execFile);

export type SvgToPdfEngine = "puppeteer" | "rsvg-convert";

export interface SvgToPdfOptions {
  engine: SvgToPdfEngine;
  rsvgConvertPath: string;
  puppeteerBrowserChannel: ChromeReleaseChannel;
  puppeteerExecutablePath?: string;
}

export interface MermaidPuppeteerOptions {
  browserChannel: string;
  executablePath?: string;
}

export interface ConvertPngToPdfOptions {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
  signal?: AbortSignal;
}

export interface ConvertPngToPdfJob {
  sourcePath: string;
  outputPath: string;
  workspacePath: string;
}

export interface ConvertPngToPdfFilesOptions {
  jobs: ConvertPngToPdfJob[];
  runId?: string;
  resolveOutputConflicts?: (conflicts: string[]) => Promise<OutputConflictDecision>;
  signal?: AbortSignal;
  supportedExtensions?: readonly string[];
  svgToPdf?: SvgToPdfOptions;
  mermaid?: MermaidPuppeteerOptions;
}

export async function convertPngToPdf(options: ConvertPngToPdfOptions): Promise<void> {
  const { sourcePath, outputPath, workspacePath, signal } = options;

  signal?.throwIfAborted();
  await assertExistingPathInWorkspace(sourcePath, workspacePath);
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await assertOutputDoesNotExist(outputPath);
  signal?.throwIfAborted();

  await writeImageAsPdf(sourcePath, outputPath, workspacePath, signal);
}

export async function convertPngToPdfFiles(
  options: ConvertPngToPdfFilesOptions,
): Promise<CommittedConversionOutput[]> {
  options.signal?.throwIfAborted();
  validateJobs(options.jobs, options.supportedExtensions ?? DEFAULT_SUPPORTED_IMAGE_EXTENSIONS);
  await validateJobPaths(options.jobs);
  options.signal?.throwIfAborted();

  const runId = options.runId ?? `${Date.now()}-${crypto.randomUUID()}`;
  const limit = pLimit(CONVERSION_CONCURRENCY);
  const stagedOutputs = await Promise.all(
    options.jobs.map((job, index) =>
      limit(() =>
        stagePngConversion(job, index, runId, options.signal, options.svgToPdf, options.mermaid),
      ),
    ),
  );

  options.signal?.throwIfAborted();
  return commitConversionOutputs(stagedOutputs, {
    ...(options.signal !== undefined && { signal: options.signal }),
    ...(options.resolveOutputConflicts !== undefined && {
      resolveConflicts: options.resolveOutputConflicts,
    }),
  });
}

async function stagePngConversion(
  job: ConvertPngToPdfJob,
  index: number,
  runId: string,
  signal?: AbortSignal,
  svgToPdf?: SvgToPdfOptions,
  mermaid?: MermaidPuppeteerOptions,
): Promise<PreparedConversionOutput> {
  signal?.throwIfAborted();
  const stagedOutputPath = path.join(
    job.workspacePath,
    ".latex-graphics-helper",
    "convert-png-to-pdf",
    runId,
    `${index + 1}`,
    "result.pdf",
  );

  await writeImageAsPdf(
    job.sourcePath,
    stagedOutputPath,
    job.workspacePath,
    signal,
    svgToPdf,
    mermaid,
  );
  signal?.throwIfAborted();

  return {
    stagedOutputPath,
    outputPath: job.outputPath,
    workspacePath: job.workspacePath,
  };
}

async function writeImageAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  svgToPdf?: SvgToPdfOptions,
  mermaid?: MermaidPuppeteerOptions,
): Promise<void> {
  const extension = path.extname(sourcePath).toLowerCase();

  if (MERMAID_EXTENSIONS.includes(extension as (typeof MERMAID_EXTENSIONS)[number])) {
    await writeMermaidAsPdf(sourcePath, outputPath, workspacePath, signal, mermaid);
    return;
  }

  if (extension === SVG_EXTENSION) {
    await writeSvgAsPdf(sourcePath, outputPath, workspacePath, signal, svgToPdf);
    return;
  }

  await writeRasterImageAsPdf(sourcePath, outputPath, workspacePath, signal);
}

async function writeMermaidAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  mermaid?: MermaidPuppeteerOptions,
): Promise<void> {
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  try {
    await runMermaidCli(sourcePath, asPdfOutputPath(outputPath), {
      outputFormat: "pdf",
      puppeteerConfig: createMermaidPuppeteerConfig(mermaid),
      quiet: true,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(`Mermaid CLI failed: ${errorMessage(error)}`, { cause: error });
  }
}

function createMermaidPuppeteerConfig(
  options: MermaidPuppeteerOptions = { browserChannel: "chrome" },
): Record<string, unknown> {
  if (options.executablePath) {
    return {
      executablePath: options.executablePath,
      headless: true,
    };
  }

  return {
    channel: options.browserChannel,
    headless: true,
  };
}

function asPdfOutputPath(outputPath: string): `${string}.pdf` {
  if (!outputPath.toLowerCase().endsWith(".pdf")) {
    throw new Error(`Mermaid PDF output path must end with .pdf: ${outputPath}`);
  }

  return outputPath as `${string}.pdf`;
}

async function writeRasterImageAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const sourceBuffer = await readFile(sourcePath);
  signal?.throwIfAborted();
  const metadata = await sharp(sourceBuffer).metadata();
  signal?.throwIfAborted();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const imageBuffer = await sharp(sourceBuffer).png().toBuffer();
  signal?.throwIfAborted();
  const pdfDocument = await PDFDocument.create();
  const page = pdfDocument.addPage([width, height]);
  const embeddedImage = await pdfDocument.embedPng(imageBuffer);
  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDocument.save();
  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();
  await writeFile(outputPath, pdfBytes);
}

async function writeSvgAsPdf(
  sourcePath: string,
  outputPath: string,
  workspacePath: string,
  signal?: AbortSignal,
  svgToPdf?: SvgToPdfOptions,
): Promise<void> {
  const options = svgToPdf ?? {
    engine: "puppeteer",
    rsvgConvertPath: "rsvg-convert",
    puppeteerBrowserChannel: "chrome",
  };
  const size = await readSvgSize(sourcePath);

  signal?.throwIfAborted();
  await assertWritablePathInWorkspace(outputPath, workspacePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  signal?.throwIfAborted();

  if (options.engine === "rsvg-convert") {
    await writeSvgAsPdfWithRsvgConvert(sourcePath, outputPath, options.rsvgConvertPath, signal);
  } else {
    await writeSvgAsPdfWithPuppeteer(sourcePath, outputPath, size, options, signal);
  }

  signal?.throwIfAborted();
  await normalizePdfPageSize(outputPath, size.width, size.height);
}

async function readSvgSize(sourcePath: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(sourcePath).metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error(`Could not determine SVG dimensions: ${sourcePath}`);
  }

  return { width, height };
}

async function writeSvgAsPdfWithRsvgConvert(
  sourcePath: string,
  outputPath: string,
  rsvgConvertPath: string,
  signal?: AbortSignal,
): Promise<void> {
  await execFileAsync(rsvgConvertPath, ["--format=pdf", "--output", outputPath, sourcePath], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    signal,
  });
}

async function writeSvgAsPdfWithPuppeteer(
  sourcePath: string,
  outputPath: string,
  size: { width: number; height: number },
  options: SvgToPdfOptions,
  signal?: AbortSignal,
): Promise<void> {
  const rawSvg = await readFile(sourcePath, "utf8");
  const svg = rawSvg.replace(/^<\?xml[^>]*\?>/i, "").trim();
  signal?.throwIfAborted();

  let browser: Browser | undefined;

  try {
    browser = await launch({
      headless: true,
      env: puppeteerLaunchEnv(),
      ...(options.puppeteerExecutablePath
        ? { executablePath: options.puppeteerExecutablePath }
        : { channel: options.puppeteerBrowserChannel }),
    });
    signal?.throwIfAborted();

    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.isNavigationRequest()) {
        request.continue().catch(() => {});
        return;
      }
      request.abort().catch(() => {});
    });
    await page.setContent(svgPageHtml(svg, size), { waitUntil: "load" });
    signal?.throwIfAborted();
    await page.pdf({
      path: outputPath,
      width: `${size.width / 72}in`,
      height: `${size.height / 72}in`,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: false,
    });
  } finally {
    await browser?.close().catch(() => {});
  }
}

function puppeteerLaunchEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function svgPageHtml(svg: string, size: { width: number; height: number }): string {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    "<style>",
    "@page { margin: 0; }",
    `html, body { margin: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden; }`,
    "svg { display: block; width: 100%; height: 100%; }",
    "</style>",
    "</head>",
    "<body>",
    svg,
    "</body>",
    "</html>",
  ].join("");
}

async function normalizePdfPageSize(
  outputPath: string,
  width: number,
  height: number,
): Promise<void> {
  const pdfDocument = await PDFDocument.load(await readFile(outputPath));
  if (pdfDocument.getPageCount() === 0) {
    throw new Error(`Generated PDF has no pages: ${outputPath}`);
  }

  const firstPage = pdfDocument.getPage(0);
  setPageSize(firstPage, width, height);

  await writeFile(outputPath, await pdfDocument.save());
}

function setPageSize(page: PDFPage, width: number, height: number): void {
  page.setMediaBox(0, 0, width, height);
  page.setCropBox(0, 0, width, height);
}

async function validateJobPaths(jobs: ConvertPngToPdfJob[]): Promise<void> {
  await Promise.all(
    jobs.flatMap((job) => [
      assertExistingPathInWorkspace(job.sourcePath, job.workspacePath),
      assertWritablePathInWorkspace(job.outputPath, job.workspacePath),
      assertWritablePathInWorkspace(
        path.join(job.workspacePath, ".latex-graphics-helper", "convert-png-to-pdf"),
        job.workspacePath,
      ),
    ]),
  );
}

function validateJobs(jobs: ConvertPngToPdfJob[], supportedExtensions: readonly string[]): void {
  if (jobs.length === 0) {
    throw new Error("No image files were selected.");
  }

  const supportedExtensionSet = new Set(
    supportedExtensions.map((extension) => extension.toLowerCase()),
  );

  for (const job of jobs) {
    if (!supportedExtensionSet.has(path.extname(job.sourcePath).toLowerCase())) {
      throw new Error(`Unsupported image format: ${job.sourcePath}`);
    }
  }
}

async function assertOutputDoesNotExist(outputPath: string): Promise<void> {
  try {
    await access(outputPath);
    throw new Error(`Output file already exists: ${outputPath}`);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }
}

function isFileNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
