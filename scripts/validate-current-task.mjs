import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_HEADINGS = [
  "Change Contract",
  "Allowed behaviors",
  "Allowed files",
  "Evidence matrix",
  "Dependencies",
  "Not changing",
];

function parseArguments(argv) {
  const options = { root: process.cwd(), files: [], base: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      options.root = path.resolve(argv[++index]);
    } else if (argument === "--files") {
      options.files.push(...argv[++index].split(",").filter(Boolean));
    } else if (argument === "--base") {
      options.base = argv[++index];
    } else if (argument === "--help") {
      console.log(
        "Usage: node scripts/validate-current-task.mjs [--root path] [--files path,...] [--base ref]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function runGit(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function changedFiles(root, options) {
  if (options.files?.length > 0) {
    return [
      ...new Set(options.files.map((file) => file.replaceAll("\\", "/").replace(/^\.\//, ""))),
    ];
  }

  const commands = options.base
    ? [["diff", "--name-only", `${options.base}...HEAD`]]
    : [
        ["diff", "--name-only"],
        ["diff", "--cached", "--name-only"],
        ["ls-files", "--others", "--exclude-standard"],
      ];
  return [
    ...new Set(
      commands
        .flatMap((args) => runGit(root, args).split("\n"))
        .map((file) => file.trim().replaceAll("\\", "/"))
        .filter(Boolean),
    ),
  ];
}

function section(markdown, heading) {
  const headingStart = markdown.search(
    new RegExp(`^### ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m"),
  );
  if (headingStart < 0) return "";
  const bodyStart = markdown.indexOf("\n", headingStart) + 1;
  const remainder = markdown.slice(bodyStart);
  const nextHeading = remainder.search(/^### |^## /m);
  return nextHeading < 0 ? remainder : remainder.slice(0, nextHeading);
}

function hasEvidence(markdown) {
  const matrix = section(markdown, "Evidence matrix");
  return matrix
    .split("\n")
    .some((line) => /^\|\s*B-\d+\s*\|/.test(line) && !/^\|\s*B-\d+\s*\|\s*\|/.test(line));
}

function extractAllowedPatterns(markdown) {
  return section(markdown, "Allowed files")
    .split("\n")
    .flatMap((line) => [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]))
    .filter(Boolean);
}

function globToRegExp(pattern) {
  let expression = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        expression += "(?:.*/)?";
      } else {
        expression += ".*";
      }
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${expression}$`);
}

function isAllowed(file, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern.replaceAll("\\", "/")).test(file));
}

function linkedDocuments(root, markdown) {
  const links = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(
    (match) => match[1].split("#", 1)[0],
  );
  const relevant = links.filter(
    (link) =>
      link.startsWith("../specs/") ||
      link.startsWith("../adr/") ||
      link.startsWith("docs/specs/") ||
      link.startsWith("docs/adr/"),
  );
  return relevant.filter((link) => existsSync(path.resolve(root, "docs/tasks", link)));
}

export function validateCurrentTask({ root = process.cwd(), files = [], base } = {}) {
  const errors = [];
  const readmePath = path.join(root, "docs/tasks/README.md");
  if (!existsSync(readmePath)) {
    return {
      ok: false,
      errors: ["docs/tasks/README.md does not exist"],
      currentTaskPath: undefined,
      changedFiles: [],
    };
  }

  const readme = readFileSync(readmePath, "utf8");
  const currentStart = readme.search(/^## Current Task\s*$/m);
  const currentBody = currentStart < 0 ? "" : readme.slice(readme.indexOf("\n", currentStart) + 1);
  const currentNextHeading = currentBody.search(/^## /m);
  const currentSection =
    currentNextHeading < 0 ? currentBody : currentBody.slice(0, currentNextHeading);
  const currentLinks = [...currentSection.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map(
    (match) => match[1],
  );
  if (currentLinks.length !== 1) {
    errors.push(`Current Task must contain exactly one link (found ${currentLinks.length})`);
    return { ok: false, errors, currentTaskPath: undefined, changedFiles: [] };
  }

  const currentTaskPath = path.resolve(root, "docs/tasks", currentLinks[0]);
  if (!existsSync(currentTaskPath)) {
    errors.push(`Current Task link does not exist: ${currentLinks[0]}`);
    return { ok: false, errors, currentTaskPath, changedFiles: [] };
  }

  const task = readFileSync(currentTaskPath, "utf8");
  const status = task.match(/^## Status\s*$\n\s*(Todo|In Progress|Blocked|Done)\s*$/m)?.[1];
  if (status !== "In Progress") {
    errors.push(`Current Task status must be In Progress (found ${status ?? "missing"})`);
  }
  for (const heading of REQUIRED_HEADINGS) {
    const level = heading === "Change Contract" ? "##" : "###";
    if (
      !new RegExp(`^${level} ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(
        task,
      )
    ) {
      errors.push(`Current Task is missing required section: ${level} ${heading}`);
    }
  }

  if (!section(task, "Allowed behaviors").match(/^\s*[-*]\s+\S+/m)) {
    errors.push("Allowed behaviors must contain at least one behavior");
  }
  const allowedPatterns = extractAllowedPatterns(task);
  if (allowedPatterns.length === 0) {
    errors.push("Allowed files must contain concrete paths or globs in backticks");
  }
  if (!hasEvidence(task)) {
    errors.push("Evidence matrix must contain at least one B-### evidence row");
  }
  if (linkedDocuments(root, task).length === 0) {
    errors.push("Current Task must link to an existing docs/specs or docs/adr document");
  }

  const taskRelativePath = path.relative(root, currentTaskPath).replaceAll("\\", "/");
  const currentFiles = [
    ...new Set(
      [...files, taskRelativePath].map((file) => file.replaceAll("\\", "/").replace(/^\.\//, "")),
    ),
  ];
  let actualChangedFiles;
  if (files.length > 0) {
    actualChangedFiles = currentFiles;
  } else if (base) {
    actualChangedFiles = [
      taskRelativePath,
      ...runGit(root, ["diff", "--name-only", `${base}...HEAD`])
        .split("\n")
        .filter(Boolean),
    ];
  } else {
    actualChangedFiles = changedFiles(root, {});
  }
  for (const file of actualChangedFiles) {
    if (file === taskRelativePath) continue;
    if (!isAllowed(file, allowedPatterns)) {
      errors.push(`Changed file is outside Allowed files: ${file}`);
    }
  }

  const sourceChanged = actualChangedFiles.some(
    (file) => /^(src|webview|scripts|test)\//.test(file) || file === "package.json",
  );
  if (sourceChanged && !hasEvidence(task)) {
    errors.push("Source/config changes require a non-empty Evidence matrix");
  }
  return {
    ok: errors.length === 0,
    errors,
    currentTaskPath,
    changedFiles: actualChangedFiles,
    status,
  };
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const base = options.base ?? process.env.LGH_TASK_BASE;
    const result = validateCurrentTask({
      ...options,
      root: options.root,
      files: options.files,
      base,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
