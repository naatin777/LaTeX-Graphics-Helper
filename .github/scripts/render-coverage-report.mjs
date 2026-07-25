import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORTS = [
  ["Linux", "vscode-extension-host-coverage-Linux/lcov.info"],
  ["macOS", "vscode-extension-host-coverage-macOS/lcov.info"],
  ["Windows", "vscode-extension-host-coverage-Windows/lcov.info"],
];

const PRIORITY_FILE_LIMIT = 15;

function readArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Usage: render-coverage-report.mjs --input <directory> --output <file>");
    }
    values.set(key.slice(2), value);
  }

  const input = values.get("input");
  const output = values.get("output");
  if (!input || !output) throw new Error("Both --input and --output are required");
  return { input, output };
}

function normalizeSourcePath(source) {
  const normalized = source.replaceAll("\\", "/");
  const srcIndex = normalized.lastIndexOf("/src/");
  return srcIndex >= 0 ? normalized.slice(srcIndex + 1) : normalized;
}

function parseLcov(content) {
  const files = new Map();
  let currentPath;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.startsWith("SF:")) {
      currentPath = normalizeSourcePath(line.slice(3));
      if (!files.has(currentPath)) files.set(currentPath, new Map());
      continue;
    }
    if (!currentPath || !line.startsWith("DA:")) continue;

    const [lineNumberText, hitsText] = line.slice(3).split(",", 2);
    const lineNumber = Number(lineNumberText);
    const hits = Number(hitsText);
    const lines = files.get(currentPath);
    lines.set(lineNumber, (lines.get(lineNumber) ?? 0) + (Number.isFinite(hits) ? hits : 0));
  }

  return new Map(
    [...files.entries()]
      .filter(([filePath]) => filePath.startsWith("src/"))
      .map(([filePath, lines]) => {
        const total = lines.size;
        const covered = [...lines.values()].filter((hits) => hits > 0).length;
        return [
          filePath,
          {
            total,
            covered,
            uncovered: total - covered,
            percent: total === 0 ? 0 : (covered / total) * 100,
          },
        ];
      }),
  );
}

function summarize(files) {
  const values = [...files.values()];
  const total = values.reduce((sum, file) => sum + file.total, 0);
  const covered = values.reduce((sum, file) => sum + file.covered, 0);
  return {
    files,
    total,
    covered,
    percent: total === 0 ? 0 : (covered / total) * 100,
    uncoveredFiles: values.filter((file) => file.total > 0 && file.covered === 0).length,
  };
}

function sourceLink(filePath) {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = process.env.COVERAGE_SOURCE_SHA || process.env.GITHUB_SHA;
  if (!server || !repository || !sha) return `\`${filePath}\``;
  return `[\`${filePath}\`](${server}/${repository}/blob/${sha}/${filePath})`;
}

function coverageCell(file) {
  return file ? `${file.percent.toFixed(1)}% · ${file.uncovered}行` : "—";
}

function collectPriorityFiles(reports) {
  const paths = new Set(reports.flatMap((report) => [...report.summary.files.keys()]));
  return [...paths]
    .map((filePath) => {
      const byOs = new Map(reports.map((report) => [report.os, report.summary.files.get(filePath)]));
      const maxUncovered = Math.max(...[...byOs.values()].map((file) => file?.uncovered ?? 0));
      return { path: filePath, byOs, maxUncovered };
    })
    .filter((file) => file.maxUncovered > 0)
    .sort((left, right) => right.maxUncovered - left.maxUncovered || left.path.localeCompare(right.path))
    .slice(0, PRIORITY_FILE_LIMIT);
}

function collectCompletelyUncoveredFiles(reports) {
  const paths = new Set(reports.flatMap((report) => [...report.summary.files.keys()]));
  return [...paths]
    .map((filePath) => ({
      path: filePath,
      byOs: new Map(reports.map((report) => [report.os, report.summary.files.get(filePath)])),
    }))
    .filter((file) => [...file.byOs.values()].some((entry) => entry && entry.total > 0 && entry.covered === 0))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function actionsRunUrl() {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  return server && repository && runId ? `${server}/${repository}/actions/runs/${runId}` : undefined;
}

function renderReport(reports) {
  const output = [
    "## VS Code Extension Host Coverage",
    "",
    "| OS | Line coverage | covered / total | Source files | 0% files |",
    "|---|---:|---:|---:|---:|",
  ];

  for (const report of reports) {
    output.push(
      `| ${report.os} | ${report.summary.percent.toFixed(1)}% | ${report.summary.covered}/${report.summary.total} | ${report.summary.files.size} | ${report.summary.uncoveredFiles} |`,
    );
  }

  output.push(
    "",
    "### 改善優先度が高いファイル",
    "",
    "未coverage行数の最大値が多い順です。各セルは `coverage率 · 未coverage行数` を示します。",
    "",
    "| ファイル | Linux | macOS | Windows |",
    "|---|---:|---:|---:|",
  );

  for (const file of collectPriorityFiles(reports)) {
    output.push(
      `| ${sourceLink(file.path)} | ${coverageCell(file.byOs.get("Linux"))} | ${coverageCell(file.byOs.get("macOS"))} | ${coverageCell(file.byOs.get("Windows"))} |`,
    );
  }

  const uncoveredFiles = collectCompletelyUncoveredFiles(reports);
  output.push(
    "",
    "<details>",
    `<summary><strong>完全に未実行のファイル (${uncoveredFiles.length})</strong></summary>`,
    "",
  );

  if (uncoveredFiles.length === 0) {
    output.push("完全に未実行のファイルはありません。");
  } else {
    output.push("| ファイル | Linux | macOS | Windows |", "|---|---:|---:|---:|");
    for (const file of uncoveredFiles) {
      output.push(
        `| ${sourceLink(file.path)} | ${coverageCell(file.byOs.get("Linux"))} | ${coverageCell(file.byOs.get("macOS"))} | ${coverageCell(file.byOs.get("Windows"))} |`,
      );
    }
  }

  output.push(
    "",
    "</details>",
    "",
    "> Windowsは現在`includeAll`を無効化しているため、未読み込みファイルは母集団に含まれず `—` と表示されます。",
  );

  const runUrl = actionsRunUrl();
  output.push(
    "",
    runUrl
      ? `[行ごとのHTMLレポートはActions artifactsから確認できます。](${runUrl})`
      : "行ごとのHTMLレポートはActions artifactsから確認できます。",
    "",
    "<!-- latex-graphics-helper-coverage-report -->",
  );
  return `${output.join("\n")}\n`;
}

const { input, output } = readArguments(process.argv.slice(2));
const reports = [];
for (const [os, relativePath] of REPORTS) {
  const content = await readFile(path.join(input, relativePath), "utf8");
  reports.push({ os, summary: summarize(parseLcov(content)) });
}
await writeFile(output, renderReport(reports), "utf8");
