/* oxlint-disable vitest/expect-expect */

// Test target:
// - latex-graphics-helper.convertToPdf commandが登録されること
// - PNGをPDFに変換できること
// - JPEG、WebPをPDFに変換できること
// - AVIFをPDFに変換できること
// - SVGをPDFに変換できること
// - MermaidをPDFに変換できること
// - PNGとSVGを1回のコマンドでPDFへ変換できること
// - 複数PNGを1回のコマンドでPDFへ変換できること
// - 非対応入力が含まれる場合、変換全体を開始しないこと
// - 入力形式と出力形式が同じ場合、変換全体を開始しないこと
// - 出力PDFが1ページであること
// - PDFページサイズが入力画像のpixel幅・高さと同じ数値のpointになること
//
// Mocked:
// - VS Codeの通知API。通知UIの選択はここでは対象外にし、command completionを直接検証する。
//
// Not tested:
// - Draw.ioからPDFへの変換詳細
// - 画像を1つのPDFへ結合する機能
// - context menuの画面上の表示
// - Safe Modeダイアログの画面表示
// - VS Codeのprogress notificationの画面表示
// - cancellation tokenのUI操作

import assert from "node:assert/strict";
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import sinon from "sinon";
import * as vscode from "vscode";

import { runCommandAndClearNotificationsUntilDone } from "./helpers/vscode_command.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePngPath = path.join(testDirectory, "..", "..", "test", "fixtures", "test.png");
const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";
const generatedImageWidth = 17;
const generatedImageHeight = 13;
const generatedSvgWidth = 31;
const generatedSvgHeight = 19;

const jpegAndWebpVariants = [
  {
    basename: "source-jpeg",
    extension: "jpeg",
    imageBase64:
      "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAANABEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCbAL6KAA//2Q==",
  },
  {
    basename: "source-webp",
    extension: "webp",
    imageBase64:
      "UklGRkAAAABXRUJQVlA4IDQAAADQAgCdASoRAA0APm0skkWkIqGYBABABsSxgDsAAIGwAP7w+iv/ySPVzHQf/oUbKJpMAAAA",
  },
] as const;

const avifVariant = {
  basename: "source-avif",
  extension: "avif",
  imageBase64:
    "AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAAXBtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAANGlsb2MAAAAAREAAAgABAAAAAAGUAAEAAAAAAAAAHQACAAAAAAGxAAEAAAAAAAAAFQAAADhpaW5mAAAAAAACAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAFWluZmUCAAAAAAIAAGF2MDEAAAAAr2lwcnAAAACKaXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAABEAAAANAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAcAAAAAA5waXhpAAAAAAEIAAAAOGF1eEMAAAAAdXJuOm1wZWc6bXBlZ0I6Y2ljcDpzeXN0ZW1zOmF1eGlsaWFyeTphbHBoYQAAAAAdaXBtYQAAAAAAAAACAAEDgQIDAAIEhAIFhgAAABppcmVmAAAAAAAAAA5hdXhsAAIAAQABAAAAOm1kYXQSAAoIOBDhjCAhoNIyDxgAAABAAeAHi4pg1AUBKBIACgUYEOGMKjIKGAAAAQAF04DygA==",
} as const;

const imageVariants = [
  ...jpegAndWebpVariants,
  {
    ...avifVariant,
  },
] as const;

suite("convertToPdf command", () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
    sandbox.stub(vscode.window, "showErrorMessage").resolves(undefined);
  });

  teardown(() => {
    sandbox.restore();
  });

  test("command is registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(CONVERT_TO_PDF_COMMAND));
  });

  test("converts a PNG to a one-page PDF with the image pixel size as page points", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.png");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      await copyFile(fixturePngPath, sourcePath);

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));

      await assertPdfPageSizeMatchesImage(outputPath, sourcePath);
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("converts JPEG and WebP files to one-page PDFs with image pixel sizes as page points", async () => {
    await assertImageVariantsConvertToPdf(jpegAndWebpVariants);
  });

  test("converts an AVIF file to a one-page PDF with the image pixel size as page points", async () => {
    await assertImageVariantsConvertToPdf([avifVariant]);
  });

  test("converts an SVG to a one-page PDF with the SVG width and height as page points", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const sourcePath = path.join(temporaryDirectory, "source.svg");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      await writeTestSvg(sourcePath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSize(outputPath, generatedSvgWidth, generatedSvgHeight);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("converts an .mmd file to a readable PDF", async () => {
    await assertMermaidFileConvertsToPdf("source.mmd");
  });

  test("converts a .mermaid file to a readable PDF", async () => {
    await assertMermaidFileConvertsToPdf("source.mermaid");
  });

  test("converts editable Draw.io PNG and SVG files with Draw.io output template", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");

    try {
      const fixturePdfPath = path.join(temporaryDirectory, "fixture.pdf");
      const drawioPngPath = path.join(temporaryDirectory, "source.drawio.png");
      const dioSvgPath = path.join(temporaryDirectory, "diagram.dio.svg");
      const drawioPngOutputPath = path.join(temporaryDirectory, "source.pdf");
      const dioSvgOutputPath = path.join(temporaryDirectory, "diagram.pdf");
      const fakeDrawioPath = await createFakeDrawioCommand(temporaryDirectory, fixturePdfPath);

      await writeOnePagePdf(fixturePdfPath);
      await writeFile(drawioPngPath, "editable drawio png");
      await writeFile(dioSvgPath, "editable drawio svg");
      await configuration.update(
        "execPath.drawio",
        fakeDrawioPath,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        "${fileDirname}/${fileBasenameNoExtension}.pdf",
        vscode.ConfigurationTarget.Workspace,
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(drawioPngPath),
        [vscode.Uri.file(drawioPngPath), vscode.Uri.file(dioSvgPath)],
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertReadablePdfWithAtLeastOnePage(drawioPngOutputPath);
      await assertReadablePdfWithAtLeastOnePage(dioSvgOutputPath);
    } finally {
      await configuration.update(
        "execPath.drawio",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("converts files with uppercase extensions", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");

    try {
      const fixturePdfPath = path.join(temporaryDirectory, "fixture.pdf");
      const pngPath = path.join(temporaryDirectory, "raster.PNG");
      const drawioPath = path.join(temporaryDirectory, "diagram.DRAWIO.PNG");
      const fakeDrawioPath = await createFakeDrawioCommand(temporaryDirectory, fixturePdfPath);

      await writeOnePagePdf(fixturePdfPath);
      await copyFile(fixturePngPath, pngPath);
      await writeFile(drawioPath, "editable drawio png");
      await configuration.update(
        "execPath.drawio",
        fakeDrawioPath,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        "${fileDirname}/${fileBasenameNoExtension}.pdf",
        vscode.ConfigurationTarget.Workspace,
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(pngPath),
        [vscode.Uri.file(pngPath), vscode.Uri.file(drawioPath)],
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSizeMatchesImage(path.join(temporaryDirectory, "raster.pdf"), pngPath);
      await assertReadablePdfWithAtLeastOnePage(path.join(temporaryDirectory, "diagram.pdf"));
    } finally {
      await configuration.update(
        "execPath.drawio",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("keeps both files for editable Draw.io image output conflicts in Safe Mode", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    const showWarningMessage = sandbox
      .stub(vscode.window, "showWarningMessage")
      .resolves({ title: "Keep Both" });

    try {
      const fixturePdfPath = path.join(temporaryDirectory, "fixture.pdf");
      const sourcePath = path.join(temporaryDirectory, "source.drawio.png");
      const originalOutputPath = path.join(temporaryDirectory, "source.pdf");
      const keptOutputPath = path.join(temporaryDirectory, "source-1.pdf");
      const fakeDrawioPath = await createFakeDrawioCommand(temporaryDirectory, fixturePdfPath);

      await writeOnePagePdf(fixturePdfPath);
      await writeFile(sourcePath, "editable drawio png");
      await writeFile(originalOutputPath, "old output");
      await configuration.update(
        "execPath.drawio",
        fakeDrawioPath,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        "${fileDirname}/${fileBasenameNoExtension}.pdf",
        vscode.ConfigurationTarget.Workspace,
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.ok(showWarningMessage.calledOnce);
      assert.strictEqual(await readFile(originalOutputPath, "utf8"), "old output");
      await assertReadablePdfWithAtLeastOnePage(keptOutputPath);
    } finally {
      await configuration.update(
        "execPath.drawio",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("undo restores overwritten output after editable Draw.io image conversion", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    (vscode.window.showInformationMessage as sinon.SinonStub).resolves("Undo");
    sandbox.stub(vscode.window, "showWarningMessage").resolves({ title: "Overwrite" });

    try {
      const fixturePdfPath = path.join(temporaryDirectory, "fixture.pdf");
      const sourcePath = path.join(temporaryDirectory, "source.drawio.png");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      const fakeDrawioPath = await createFakeDrawioCommand(temporaryDirectory, fixturePdfPath);

      await writeOnePagePdf(fixturePdfPath);
      await writeFile(sourcePath, "editable drawio png");
      await writeFile(outputPath, "old output");
      await configuration.update(
        "execPath.drawio",
        fakeDrawioPath,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        "${fileDirname}/${fileBasenameNoExtension}.pdf",
        vscode.ConfigurationTarget.Workspace,
      );

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(sourcePath),
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      assert.strictEqual(await readFile(outputPath, "utf8"), "old output");
      assert.ok(
        (vscode.window.showInformationMessage as sinon.SinonStub)
          .getCalls()
          .some((call) => String(call.args[0]).includes("Removed the last conversion output.")),
      );
    } finally {
      await configuration.update(
        "execPath.drawio",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("does not reflect editable Draw.io image output when already cancelled", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();
    const configuration = vscode.workspace.getConfiguration("latex-graphics-helper");
    sandbox.stub(vscode.window, "withProgress").callsFake(async (_options, task) => {
      return await task(
        { report: () => {} },
        {
          isCancellationRequested: true,
          onCancellationRequested: () => ({ dispose: () => {} }),
        },
      );
    });

    try {
      const fixturePdfPath = path.join(temporaryDirectory, "fixture.pdf");
      const sourcePath = path.join(temporaryDirectory, "source.drawio.png");
      const outputPath = path.join(temporaryDirectory, "source.pdf");
      const fakeDrawioPath = await createFakeDrawioCommand(temporaryDirectory, fixturePdfPath);

      await writeOnePagePdf(fixturePdfPath);
      await writeFile(sourcePath, "editable drawio png");
      await configuration.update(
        "execPath.drawio",
        fakeDrawioPath,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        "${fileDirname}/${fileBasenameNoExtension}.pdf",
        vscode.ConfigurationTarget.Workspace,
      );

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(sourcePath));

      await assertFileDoesNotExist(outputPath);
      assert.ok(
        (vscode.window.showInformationMessage as sinon.SinonStub)
          .getCalls()
          .some((call) => String(call.args[0]).includes("PDF conversion was cancelled.")),
      );
    } finally {
      await configuration.update(
        "execPath.drawio",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await configuration.update(
        "outputPath.convertDrawioToPdf",
        undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("converts PNG and SVG files as one batch", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, "source-png.png");
      const svgPath = path.join(temporaryDirectory, "source-svg.svg");
      await copyFile(fixturePngPath, pngPath);
      await writeTestSvg(svgPath, generatedSvgWidth, generatedSvgHeight);

      const commandExecution = vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(pngPath),
        [vscode.Uri.file(pngPath), vscode.Uri.file(svgPath)],
      );
      await runCommandAndClearNotificationsUntilDone(commandExecution);

      await assertPdfPageSizeMatchesImage(replaceExtension(pngPath, ".pdf"), pngPath);
      await assertPdfPageSize(
        replaceExtension(svgPath, ".pdf"),
        generatedSvgWidth,
        generatedSvgHeight,
      );
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  test("converts multiple PNG files as one batch", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const firstSourcePath = path.join(temporaryDirectory, "first.png");
      const secondSourcePath = path.join(temporaryDirectory, "second.png");
      await copyFile(fixturePngPath, firstSourcePath);
      await copyFile(fixturePngPath, secondSourcePath);

      await vscode.commands.executeCommand(
        CONVERT_TO_PDF_COMMAND,
        vscode.Uri.file(firstSourcePath),
        [vscode.Uri.file(firstSourcePath), vscode.Uri.file(secondSourcePath)],
      );

      await assertPdfPageSizeMatchesImage(
        path.join(temporaryDirectory, "first.pdf"),
        firstSourcePath,
      );
      await assertPdfPageSizeMatchesImage(
        path.join(temporaryDirectory, "second.pdf"),
        secondSourcePath,
      );
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("does not convert any file when an unsupported input is included", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pngPath = path.join(temporaryDirectory, "source.png");
      const unsupportedPath = path.join(temporaryDirectory, "source.txt");
      await copyFile(fixturePngPath, pngPath);
      await writeFile(unsupportedPath, "not an image");

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(pngPath), [
        vscode.Uri.file(pngPath),
        vscode.Uri.file(unsupportedPath),
      ]);

      await assertFileDoesNotExist(path.join(temporaryDirectory, "source.pdf"));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });

  test("does not convert a PDF to PDF", async () => {
    const temporaryDirectory = await createTemporaryWorkspaceDirectory();

    try {
      const pdfPath = path.join(temporaryDirectory, "source.pdf");
      const pdf = await PDFDocument.create();
      pdf.addPage([120, 80]);
      await writeFile(pdfPath, await pdf.save());

      await vscode.commands.executeCommand(CONVERT_TO_PDF_COMMAND, vscode.Uri.file(pdfPath));
    } finally {
      await removeTemporaryDirectory(temporaryDirectory);
    }
  });
});

async function assertImageVariantsConvertToPdf(
  variants: readonly (typeof imageVariants)[number][],
): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePaths = await Promise.all(
      variants.map(async (variant) => {
        const sourcePath = path.join(
          temporaryDirectory,
          `${variant.basename}.${variant.extension}`,
        );
        await writeTestImage(sourcePath, variant.imageBase64);
        return sourcePath;
      }),
    );

    await vscode.commands.executeCommand(
      CONVERT_TO_PDF_COMMAND,
      vscode.Uri.file(sourcePaths[0]!),
      sourcePaths.map((sourcePath) => vscode.Uri.file(sourcePath)),
    );

    await Promise.all(
      sourcePaths.map((sourcePath) =>
        assertPdfPageSize(
          replaceExtension(sourcePath, ".pdf"),
          generatedImageWidth,
          generatedImageHeight,
        ),
      ),
    );
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function assertMermaidFileConvertsToPdf(fileName: string): Promise<void> {
  const temporaryDirectory = await createTemporaryWorkspaceDirectory();

  try {
    const sourcePath = path.join(temporaryDirectory, fileName);
    const outputPath = replaceExtension(sourcePath, ".pdf");
    await writeFile(
      sourcePath,
      ["flowchart LR", "  A[Mermaid Alpha] --> B[Mermaid Beta]", ""].join("\n"),
    );

    const commandExecution = vscode.commands.executeCommand(
      CONVERT_TO_PDF_COMMAND,
      vscode.Uri.file(sourcePath),
    );
    await runCommandAndClearNotificationsUntilDone(commandExecution);

    await assertReadablePdfWithAtLeastOnePage(outputPath);
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
  }
}

async function createTemporaryWorkspaceDirectory(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspaceFolder);

  const temporaryDirectory = await mkdtemp(
    path.join(workspaceFolder.uri.fsPath, "lgh-convert-to-pdf-"),
  );
  await mkdir(temporaryDirectory, { recursive: true });
  return temporaryDirectory;
}

async function removeTemporaryDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

async function createFakeDrawioCommand(
  directoryPath: string,
  fixturePdfPath: string,
): Promise<string> {
  const scriptPath = path.join(directoryPath, "fake-drawio.cjs");
  const commandPath = path.join(
    directoryPath,
    process.platform === "win32" ? "fake-drawio.cmd" : "fake-drawio",
  );

  await writeFile(
    scriptPath,
    [
      "const { copyFileSync, writeFileSync } = require('node:fs');",
      "const [fixturePdfPath, ...args] = process.argv.slice(2);",
      "const outputPath = args[args.indexOf('-o') + 1];",
      "if (args.includes('xml')) {",
      "  writeFileSync(outputPath, '<mxfile><diagram name=\"Page 1\" /></mxfile>');",
      "} else {",
      "  copyFileSync(fixturePdfPath, outputPath);",
      "}",
    ].join("\n"),
  );

  if (process.platform === "win32") {
    await writeFile(
      commandPath,
      `@echo off\r\n"${process.execPath}" "${scriptPath}" "${fixturePdfPath}" %*\r\n`,
    );
  } else {
    await writeFile(
      commandPath,
      [
        "#!/bin/sh",
        `exec ${JSON.stringify(process.execPath)} ${JSON.stringify(scriptPath)} ${JSON.stringify(fixturePdfPath)} "$@"`,
      ].join("\n"),
    );
    await chmod(commandPath, 0o755);
  }

  return commandPath;
}

async function writeOnePagePdf(filePath: string): Promise<void> {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  await writeFile(filePath, await document.save());
}

async function assertPdfPageSizeMatchesImage(pdfPath: string, imagePath: string): Promise<void> {
  const imageMetadata = await sharp(imagePath).metadata();
  assert.ok(imageMetadata.width);
  assert.ok(imageMetadata.height);

  await assertPdfPageSize(pdfPath, imageMetadata.width, imageMetadata.height);
}

async function writeTestImage(filePath: string, imageBase64: string): Promise<void> {
  await writeFile(filePath, Buffer.from(imageBase64, "base64"));
}

async function writeTestSvg(filePath: string, width: number, height: number): Promise<void> {
  await writeFile(
    filePath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#285078"/></svg>`,
  );
}

async function assertReadablePdfWithAtLeastOnePage(pdfPath: string): Promise<void> {
  const pdf = await PDFDocument.load(await readFile(pdfPath));

  assert.ok(pdf.getPageCount() >= 1);
}

async function assertPdfPageSize(
  pdfPath: string,
  expectedWidth: number,
  expectedHeight: number,
): Promise<void> {
  const pdf = await PDFDocument.load(await readFile(pdfPath));
  assert.strictEqual(pdf.getPageCount(), 1);

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  assertApproximatelyEqual(width, expectedWidth, 0.01);
  assertApproximatelyEqual(height, expectedHeight, 0.01);
}

function replaceExtension(filePath: string, extension: string): string {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, path.extname(filePath))}${extension}`,
  );
}

function assertApproximatelyEqual(actual: number, expected: number, tolerance: number): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

async function assertFileDoesNotExist(filePath: string): Promise<void> {
  await assert.rejects(access(filePath), (error) => {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  });
}
