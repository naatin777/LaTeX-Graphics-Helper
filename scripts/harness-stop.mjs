import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const taskScript = path.join(scriptDirectory, "validate-current-task.mjs");

function rootFromGit(cwd) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function harnessDirectory(root) {
  const gitPath = execFileSync("git", ["rev-parse", "--git-path", "lgh-harness"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return path.resolve(root, gitPath);
}

function run(name, command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return {
    name,
    command: [command, ...args].join(" "),
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function main() {
  const requestedRoot = process.argv.includes("--root") ? process.argv[process.argv.indexOf("--root") + 1] : process.cwd();
  let root;
  const results = [];
  try {
    root = rootFromGit(requestedRoot);
    const logDirectory = harnessDirectory(root);
    mkdirSync(logDirectory, { recursive: true });
    results.push(run("task-preflight", process.execPath, [taskScript, "--root", root], root));
    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    results.push(run("rulesync", pnpm, ["run", "rulesync:check"], root));
    results.push(run("lint", pnpm, ["run", "lint"], root));
    results.push(run("format", pnpm, ["run", "format"], root));
    const summary = {
      ok: results.every((result) => result.status === 0),
      root,
      logDirectory,
      results: results.map(({ name, command, status }) => ({ name, command, status })),
    };
    writeFileSync(path.join(logDirectory, "stop-latest.json"), JSON.stringify({ ...summary, details: results }, null, 2));
    console.log(JSON.stringify(summary));
    if (!summary.ok) {
      console.error(`Stop hook validation failed; see ${path.join(logDirectory, "stop-latest.json")}`);
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const summary = { ok: false, error: message };
    console.log(JSON.stringify(summary));
    console.error(`Stop hook validation could not run: ${message}`);
    process.exitCode = 1;
  }
}

main();
