import { execFile } from "node:child_process";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MIXED_NAME = "日本語 العربية हिन्दी é 🌹　ＡＢＣ space";
const TIMEOUT_MS = 180_000;

const options = parseOptions(process.argv.slice(2));
const repositoryRoot = path.resolve(options.repositoryRoot ?? process.cwd());
const workDirectory = path.resolve(options.workDirectory);
const outputDirectory = path.resolve(options.outputDirectory);

const fixtures = {
  pdf: path.join(repositoryRoot, "test", "fixtures", "pdf-operations", "user-files", " 薔薇🌹.pdf"),
  drawio: path.join(
    repositoryRoot,
    "test",
    "fixtures",
    "pdf-operations",
    "user-files",
    "q a.drawio",
  ),
  svg: path.join(repositoryRoot, "test", "fixtures", "path-compatibility", "source.svg"),
};

const toolDefinitions = [
  {
    id: "ghostscript",
    executable: options.ghostscript,
    fixture: fixtures.pdf,
    inputExtension: ".pdf",
    outputExtension: ".pdf",
    versionArguments: ["--version"],
    createInvocation(inputPath, outputPath, separatorMode) {
      return {
        executable: options.ghostscript,
        args: [
          "-dSAFER",
          "-dBATCH",
          "-dNOPAUSE",
          "-sDEVICE=pdfwrite",
          `-sOutputFile=${commandPath(outputPath, separatorMode)}`,
          commandPath(inputPath, separatorMode),
        ],
      };
    },
  },
  {
    id: "pdftocairo",
    executable: options.pdftocairo,
    fixture: fixtures.pdf,
    inputExtension: ".pdf",
    outputExtension: ".png",
    versionArguments: ["-v"],
    createInvocation(inputPath, outputPath, separatorMode) {
      const outputPrefix = outputPath.slice(0, -path.extname(outputPath).length);
      return {
        executable: options.pdftocairo,
        args: [
          "-png",
          "-singlefile",
          commandPath(inputPath, separatorMode),
          commandPath(outputPrefix, separatorMode),
        ],
      };
    },
  },
  {
    id: "rsvg-convert",
    executable: options.rsvgConvert,
    fixture: fixtures.svg,
    inputExtension: ".svg",
    outputExtension: ".pdf",
    versionArguments: ["--version"],
    createInvocation(inputPath, outputPath, separatorMode) {
      return {
        executable: options.rsvgConvert,
        args: [
          "--format=pdf",
          "--output",
          commandPath(outputPath, separatorMode),
          commandPath(inputPath, separatorMode),
        ],
      };
    },
  },
  {
    id: "drawio",
    executable: options.drawio,
    fixture: fixtures.drawio,
    inputExtension: ".drawio",
    outputExtension: ".pdf",
    versionArguments: undefined,
    createInvocation(inputPath, outputPath, separatorMode) {
      const drawioArguments = [
        "-x",
        "-f",
        "pdf",
        "-o",
        commandPath(outputPath, separatorMode),
        commandPath(inputPath, separatorMode),
      ];

      if (process.platform === "linux") {
        return {
          executable: options.xvfbRun,
          args: ["-a", options.drawio, ...drawioArguments],
        };
      }

      return { executable: options.drawio, args: drawioArguments };
    },
  },
  {
    id: "pdfcrop",
    executable: options.pdfcrop,
    fixture: fixtures.pdf,
    inputExtension: ".pdf",
    outputExtension: ".pdf",
    versionArguments: ["--version"],
    createInvocation(inputPath, outputPath, separatorMode) {
      return {
        executable: options.pdfcrop,
        args: [commandPath(inputPath, separatorMode), commandPath(outputPath, separatorMode)],
      };
    },
  },
  {
    id: "qpdf",
    executable: options.qpdf,
    fixture: fixtures.pdf,
    inputExtension: ".pdf",
    outputExtension: ".pdf",
    versionArguments: ["--version"],
    createInvocation(inputPath, outputPath, separatorMode) {
      return {
        executable: options.qpdf,
        args: [commandPath(inputPath, separatorMode), commandPath(outputPath, separatorMode)],
      };
    },
  },
];

const pathCases = [
  {
    id: "ascii-baseline",
    inputDirectoryName: "input-ascii",
    inputBaseName: "source",
    outputDirectoryName: "output-ascii",
    outputBaseName: "result",
  },
  {
    id: "unicode-input-file",
    inputDirectoryName: "input-ascii",
    inputBaseName: MIXED_NAME,
    outputDirectoryName: "output-ascii",
    outputBaseName: "result",
  },
  {
    id: "unicode-input-directory",
    inputDirectoryName: MIXED_NAME,
    inputBaseName: "source",
    outputDirectoryName: "output-ascii",
    outputBaseName: "result",
  },
  {
    id: "unicode-output-file",
    inputDirectoryName: "input-ascii",
    inputBaseName: "source",
    outputDirectoryName: "output-ascii",
    outputBaseName: MIXED_NAME,
  },
  {
    id: "unicode-output-directory",
    inputDirectoryName: "input-ascii",
    inputBaseName: "source",
    outputDirectoryName: MIXED_NAME,
    outputBaseName: "result",
  },
  {
    id: "unicode-combined",
    inputDirectoryName: MIXED_NAME,
    inputBaseName: MIXED_NAME,
    outputDirectoryName: `${MIXED_NAME} output`,
    outputBaseName: `${MIXED_NAME} result`,
  },
];

await rm(workDirectory, { recursive: true, force: true });
await mkdir(workDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const separatorModes = process.platform === "win32" ? ["native", "forward-slash"] : ["native"];
const report = {
  generatedAt: new Date().toISOString(),
  platform: process.platform,
  arch: process.arch,
  release: os.release(),
  mixedName: MIXED_NAME,
  tools: [],
};

for (const tool of toolDefinitions) {
  report.tools.push(await probeTool(tool, separatorModes));
}

await writeFile(
  path.join(outputDirectory, "report.json"),
  `${JSON.stringify(report, undefined, 2)}\n`,
  "utf8",
);
await writeFile(path.join(outputDirectory, "report.md"), renderMarkdown(report), "utf8");

process.stdout.write(renderMarkdown(report));

async function probeTool(tool, modes) {
  if (
    !tool.executable ||
    (tool.id === "drawio" && process.platform === "linux" && !options.xvfbRun)
  ) {
    return {
      id: tool.id,
      executable: tool.executable || null,
      availability: "unavailable",
      version: null,
      cases: [],
    };
  }

  const version = tool.versionArguments
    ? await execute(tool.executable, tool.versionArguments, 30_000)
    : { ok: true, stdout: "", stderr: "", exitCode: 0, error: null };
  const cases = [];

  for (const separatorMode of modes) {
    for (const pathCase of pathCases) {
      cases.push(await probeCase(tool, pathCase, separatorMode));
    }
  }

  return {
    id: tool.id,
    executable: tool.executable,
    availability: "available",
    version: conciseOutput(version),
    cases,
  };
}

async function probeCase(tool, pathCase, separatorMode) {
  const caseRoot = path.join(workDirectory, tool.id, separatorMode, pathCase.id);
  await rm(caseRoot, { recursive: true, force: true });

  const inputDirectory = path.join(caseRoot, pathCase.inputDirectoryName);
  const outputDirectoryPath = path.join(caseRoot, pathCase.outputDirectoryName);
  const inputPath = path.join(inputDirectory, `${pathCase.inputBaseName}${tool.inputExtension}`);
  const outputPath = path.join(
    outputDirectoryPath,
    `${pathCase.outputBaseName}${tool.outputExtension}`,
  );

  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(outputDirectoryPath, { recursive: true }),
  ]);
  await copyFile(tool.fixture, inputPath);

  const invocation = tool.createInvocation(inputPath, outputPath, separatorMode);
  const startedAt = performance.now();
  const result = await execute(invocation.executable, invocation.args, TIMEOUT_MS);
  const durationMs = Math.round(performance.now() - startedAt);
  const output = await outputState(outputPath);

  return {
    id: pathCase.id,
    separatorMode,
    status: result.ok && output.exists && output.size > 0 ? "passed" : "failed",
    exitCode: result.exitCode,
    error: result.error,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr),
    durationMs,
    output,
  };
}

async function execute(executable, args, timeout) {
  try {
    const result = await execFileAsync(executable, args, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      timeout,
      windowsHide: true,
    });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout === "string" ? error.stdout : "",
      stderr: typeof error.stderr === "string" ? error.stderr : "",
      exitCode: typeof error.code === "number" ? error.code : null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function outputState(outputPath) {
  try {
    const outputStat = await stat(outputPath);
    return { exists: outputStat.isFile(), size: outputStat.size };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { exists: false, size: 0 };
    }
    throw error;
  }
}

function commandPath(value, separatorMode) {
  if (process.platform === "win32" && separatorMode === "forward-slash") {
    return value.replaceAll("\\", "/");
  }
  return value;
}

function conciseOutput(result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return output ? truncate(output) : result.error;
}

function truncate(value, maximumLength = 2_000) {
  const normalized = String(value ?? "").trim();
  return normalized.length <= maximumLength ? normalized : `${normalized.slice(0, maximumLength)}…`;
}

function renderMarkdown(result) {
  const lines = [
    `# External tool path probe: ${result.platform}-${result.arch}`,
    "",
    `- Generated: ${result.generatedAt}`,
    `- OS release: ${result.release}`,
    `- Mixed path component: \`${result.mixedName}\``,
    "",
    "| Tool | Availability | Passed | Failed |",
    "| --- | --- | ---: | ---: |",
  ];

  for (const tool of result.tools) {
    const passed = tool.cases.filter((entry) => entry.status === "passed").length;
    const failed = tool.cases.filter((entry) => entry.status === "failed").length;
    lines.push(`| ${tool.id} | ${tool.availability} | ${passed} | ${failed} |`);
  }

  for (const tool of result.tools) {
    lines.push("", `## ${tool.id}`, "");
    lines.push(`- Executable: \`${tool.executable ?? "unavailable"}\``);
    lines.push(
      `- Version: ${tool.version ? `\`${tool.version.replaceAll("`", "\\`")}\`` : "unknown"}`,
    );

    if (tool.cases.length === 0) {
      lines.push("- Probe result: unavailable");
      continue;
    }

    lines.push(
      "",
      "| Case | Separator | Result | Exit | Seconds | Output bytes | Error |",
      "| --- | --- | --- | ---: | ---: | ---: | --- |",
    );
    for (const entry of tool.cases) {
      const error = (entry.error || entry.stderr || "")
        .replaceAll("|", "\\|")
        .replaceAll("\n", " ");
      lines.push(
        `| ${entry.id} | ${entry.separatorMode} | ${entry.status} | ${entry.exitCode ?? "-"} | ${(entry.durationMs / 1_000).toFixed(1)} | ${entry.output.size} | ${truncate(error, 240)} |`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function parseOptions(args) {
  const parsed = {};
  const keyMap = {
    "--repository-root": "repositoryRoot",
    "--work-directory": "workDirectory",
    "--output-directory": "outputDirectory",
    "--ghostscript": "ghostscript",
    "--pdftocairo": "pdftocairo",
    "--rsvg-convert": "rsvgConvert",
    "--drawio": "drawio",
    "--xvfb-run": "xvfbRun",
    "--pdfcrop": "pdfcrop",
    "--qpdf": "qpdf",
  };

  for (let index = 0; index < args.length; index += 2) {
    const key = keyMap[args[index]];
    const value = args[index + 1];
    if (!key || value === undefined) {
      throw new Error(`Invalid argument: ${args[index] ?? "<missing>"}`);
    }
    parsed[key] = value;
  }

  if (!parsed.workDirectory || !parsed.outputDirectory) {
    throw new Error("--work-directory and --output-directory are required");
  }

  return parsed;
}
