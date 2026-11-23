import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { PDFDocument } from 'pdf-lib';

const POLL_INTERVAL_MS = 100;

export interface VerifiedOutput {
    file: string;
    pageCount: number;
    width: number;
    height: number;
    sha256: string;
}

export interface SplitOutcome {
    outputs: VerifiedOutput[];
    outputFiles: string[];
    input: {
        hashBefore: string;
        hashAfter: string;
        unchanged: boolean;
        size: number;
    };
}

export interface VerifySplitOptions {
    inputPath: string;
    outputDir: string;
    expectedOutputPaths: string[];
    pageSizes: [number, number][];
    inputHashBefore: string;
    timeoutMs: number;
}

export async function waitForValidPdf(
    filePath: string,
    timeoutMs: number,
): Promise<{ bytes: Uint8Array; pdf: PDFDocument }> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            const bytes = await fs.readFile(filePath);
            return { bytes, pdf: await PDFDocument.load(bytes) };
        } catch (error) {
            lastError = error;
            await delay(POLL_INTERVAL_MS);
        }
    }

    const reason =
        lastError instanceof Error ? lastError.message : String(lastError ?? 'file not found');
    throw new Error(
        `Timed out after ${timeoutMs}ms waiting for a valid PDF at ${filePath}: ${reason}`,
    );
}

/**
 * Verifies that the context-menu command produced the expected single-page
 * PDFs (in order and with the original page sizes) and that the source PDF
 * was not modified.
 */
export async function verifySplitOutcome({
    inputPath,
    outputDir,
    expectedOutputPaths,
    pageSizes,
    inputHashBefore,
    timeoutMs,
}: VerifySplitOptions): Promise<SplitOutcome> {
    const outputs: VerifiedOutput[] = [];

    for (const [index, outputPath] of expectedOutputPaths.entries()) {
        const { bytes, pdf } = await waitForValidPdf(outputPath, timeoutMs);
        const page = pdf.getPage(0);
        const size = page.getSize();
        const [expectedWidth, expectedHeight] = pageSizes[index];

        assert.equal(
            pdf.getPageCount(),
            1,
            `Expected exactly one page in ${path.basename(outputPath)}`,
        );
        assert.equal(
            Math.round(size.width),
            expectedWidth,
            `Unexpected width for ${path.basename(outputPath)}`,
        );
        assert.equal(
            Math.round(size.height),
            expectedHeight,
            `Unexpected height for ${path.basename(outputPath)}`,
        );

        outputs.push({
            file: path.basename(outputPath),
            pageCount: pdf.getPageCount(),
            width: size.width,
            height: size.height,
            sha256: sha256(bytes),
        });
    }

    assert.equal(
        new Set(outputs.map((output) => output.sha256)).size,
        outputs.length,
        'Split PDFs must not contain identical page content',
    );

    const outputFiles = (await fs.readdir(outputDir))
        .filter((name) => !name.startsWith('.'))
        .toSorted();
    assert.deepEqual(
        outputFiles,
        expectedOutputPaths.map((outputPath) => path.basename(outputPath)).toSorted(),
        `Unexpected files in ${outputDir}`,
    );

    const inputBytes = await fs.readFile(inputPath);
    const inputHashAfter = sha256(inputBytes);

    assert.equal(
        inputHashAfter,
        inputHashBefore,
        'The input PDF must not be modified by the split command',
    );

    return {
        outputs,
        outputFiles,
        input: {
            hashBefore: inputHashBefore,
            hashAfter: inputHashAfter,
            unchanged: inputHashAfter === inputHashBefore,
            size: inputBytes.byteLength,
        },
    };
}

export function sha256(bytes: Uint8Array): string {
    return crypto.createHash('sha256').update(bytes).digest('hex');
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
