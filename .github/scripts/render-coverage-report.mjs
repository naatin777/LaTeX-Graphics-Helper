import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSION_REPORTS = [
  ["Linux", "vscode-extension-host-coverage-Linux/lcov.info"],
  ["macOS", "vscode-extension-host-coverage-macOS/lcov.info"],
  ["Windows", "vscode-extension-host-coverage-Windows/lcov.info"],
];

const WEBVIEW_REPORTS = [
  ["crop_pdf", "webview-vitest-coverage/crop_pdf/lcov.info"],
  ["merge_pdf", "webview-vitest-coverage/merge_pdf/lcov.info"],
  ["split_pdf", "webview-vitest-coverage/split_pdf/lcov.info"],
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

function normalizeSourcePath(source, fallbackPrefix) {
  const normalized = source.replaceAll("\\", "/");

  const webviewIndex = normalized.lastIndexOf("/webview/");
  if (webviewIndex >= 0) return normalized.slice(webviewIndex + 1);
  if (normalized.startsWith("webview/")) return normalized;

  if (fallbackPrefix) {
    const sharedIndex = normalized.lastIndexOf("/shared/");
    if (sharedIndex >= 0) return `webview/${normalized.slice(sharedIndex + 1)}`;
  }

  const srcIndex = normalized.lastIndexOf("/src/");
  if (srcIndex >= 0) return normalized.slice(srcIndex + 1);
  if (normalized.startsWith("src/")) {
    return fallbackPrefix ? `${fallbackPrefix}${normalized}` : normalized;
  }

  const relative = normalized.replace(/^(?:[A-Za-z]:)?\/+|^\.\//u, "");
  return fallbackPrefix ? `${fallbackPrefix}${relative}` : relative;
}

function parseLcov(content, fallbackPrefix) {
  const files = new Map();
  let currentPath;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.startsWith("SF:")) {
      currentPath = normalizeSourcePath(line.slice(3), fallbackPrefix);
      if (!files.has(currentPath)) files.set(currentPath, new Map());
      continue;
    }
    if (!currentPath || !line.startsWith("DA:")) continue;

    const [lineNumberText, hitsText] = line.slice(3).split(",", 2);
    const lineNumber = Number(lineNumberText);
    const hits = Number(hitsText);
    if (!Number.isFinite(lineNumber)) continue;

    const lines = files.get(currentPath);
    lines.set(lineNumber, (lines.get(lineNumber) ?? 0) + (Number.isFinite(hits) ? hits : 0));
  }

  return files;
}

function mergeCoverageMaps(maps) {
  const merged = new Map();
  for (const files of maps) {
    for (const [filePath, lines] of files) {
      if (!merged.has(filePath)) merged.set(filePath, new Map());
      const target = merged.get(filePath);
      for (const [lineNumber, hits] of lines) {
        target.set(lineNumber, (target.get(lineNumber) ?? 0) + hits);
      }
    }
  }
  return merged;
}

function summarize(lineCoverage, includeFile) {
  const files = new Map(
    [...lineCoverage.entries()]
      .filter(([filePath]) => includeFile(filePath))
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

function collectCrossPlatformPriorityFiles(reports) {
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

function collectCrossPlatformUncoveredFiles(reports) {
  const paths = new Set(reports.flatMap((report) => [...report.summary.files.keys()]));
  return [...paths]
    .map((filePath) => ({
      path: filePath,
      byOs: new Map(reports.map((report) => [report.os, report.summary.files.get(filePath)])),
    }))
    .filter((file) => [...file.byOs.values()].some((entry) => entry && entry.total > 0 && entry.covered === 0))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function collectPriorityFiles(summary) {
  return [...summary.files.entries()]
    .filter(([, file]) => file.uncovered > 0)
    .sort((left, right) => right[1].uncovered - left[1].uncovered || left[0].localeCompare(right[0]))
    .slice(0, PRIORITY_FILE_LIMIT);
}

function collectUncoveredFiles(summary) {
  return [...summary.files.entries()]
    .filter(([, file]) => file.total > 0 && file.covered === 0)
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function actionsRunUrl() {
  const server = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  return server && repository && runId ? `${server}/${repository}/actions/runs/${runId}` : undefined;
}

function renderExtensionCoverage(output, reports) {
  output.push(
    "### Extension Host",
    "",
    "| OS | Line coverage | covered / total | Source files | 0% files |",
    "|---|---:|---:|---:|---:|",
  );

  for (const report of reports) {
    output.push(
      `| ${report.os} | ${report.summary.percent.toFixed(1)}% | ${report.summary.covered}/${report.summary.total} | ${report.summary.files.size} | ${report.summary.uncoveredFiles} |`,
    );
  }

  output.push(
    "",
    "#### 改善優先度が高いExtension Hostファイル",
    "",
    "未coverage行数の最大値が多い順です。各セルは `coverage率 · 未coverage行数` を示します。",
    "",
    "| ファイル | Linux | macOS | Windows |",
    "|---|---:|---:|---:|",
  );

  for (const file of collectCrossPlatformPriorityFiles(reports)) {
    output.push(
      `| ${sourceLink(file.path)} | ${coverageCell(file.byOs.get("Linux"))} | ${coverageCell(file.byOs.get("macOS"))} | ${coverageCell(file.byOs.get("Windows"))} |`,
    );
  }

  const uncoveredFiles = collectCrossPlatformUncoveredFiles(reports);
  output.push(
    "",
    "<details>",
    `<summary><strong>完全に未実行のExtension Hostファイル (${uncoveredFiles.length})</strong></summary>`,
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
}

function renderWebviewCoverage(output, summary) {
  output.push(
    "",
    "### Webview (Vitest / Linux)",
    "",
    "Crop PDF・Merge PDF・Split PDFのVitest coverageを行単位で統合し、共有コードの重複を除いています。",
    "",
    "| Line coverage | covered / total | Source files | 0% files |",
    "|---:|---:|---:|---:|",
    `| ${summary.percent.toFixed(1)}% | ${summary.covered}/${summary.total} | ${summary.files.size} | ${summary.uncoveredFiles} |`,
    "",
    "#### 改善優先度が高いWebviewファイル",
    "",
    "| ファイル | Coverage | 未coverage行数 |",
    "|---|---:|---:|",
  );

  for (const [filePath, file] of collectPriorityFiles(summary)) {
    output.push(`| ${sourceLink(filePath)} | ${file.percent.toFixed(1)}% | ${file.uncovered} |`);
  }

  const uncoveredFiles = collectUncoveredFiles(summary);
  output.push(
    "",
    "<details>",
    `<summary><strong>完全に未実行のWebviewファイル (${uncoveredFiles.length})</strong></summary>`,
    "",
  );

  if (uncoveredFiles.length === 0) {
    output.push("完全に未実行のファイルはありません。");
  } else {
    output.push("| ファイル | 対象行数 |", "|---|---:|");
    for (const [filePath, file] of uncoveredFiles) {
      output.push(`| ${sourceLink(filePath)} | ${file.total} |`);
    }
  }

  output.push("", "</details>");
}

function renderReport(extensionReports, webviewSummary) {
  const output = ["## Automated Test Coverage", ""];
  renderExtensionCoverage(output, extensionReports);
  renderWebviewCoverage(output, webviewSummary);

  output.push(
    "",
    "> Playwright ElectronはLinux・macOS・WindowsでE2Eテストとして実行しますが、coverageの集計対象には含めません。",
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

const extensionReports = [];
for (const [os, relativePath] of EXTENSION_REPORTS) {
  const content = await readFile(path.join(input, relativePath), "utf8");
  const summary = summarize(parseLcov(content), (filePath) => filePath.startsWith("src/"));
  if (summary.files.size === 0) throw new Error(`${os} Extension Host coverage is empty`);
  extensionReports.push({ os, summary });
}

const webviewCoverageMaps = [];
for (const [appName, relativePath] of WEBVIEW_REPORTS) {
  const content = await readFile(path.join(input, relativePath), "utf8");
  webviewCoverageMaps.push(parseLcov(content, `webview/apps/${appName}/`));
}
const webviewSummary = summarize(mergeCoverageMaps(webviewCoverageMaps), (filePath) =>
  filePath.startsWith("webview/"),
);
if (webviewSummary.files.size === 0) throw new Error("Webview coverage is empty");

await writeFile(output, renderReport(extensionReports, webviewSummary), "utf8");
