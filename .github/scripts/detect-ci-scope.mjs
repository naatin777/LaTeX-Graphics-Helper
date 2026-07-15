#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { classifyCiScope } from "./ci-scope/classify-ci-scope.mjs";
import { createInputFromEnvironment } from "./ci-scope/read-git-diff.mjs";

export { classifyCiScope } from "./ci-scope/classify-ci-scope.mjs";

function writeGitHubOutputs(outputPath, decision) {
  if (typeof outputPath !== "string" || outputPath.length === 0) {
    throw new Error("GITHUB_OUTPUT is not set");
  }

  const outputs = {
    browser_playwright_os: JSON.stringify(decision.targets.browserPlaywright),
    decision: JSON.stringify(decision),
    electron_e2e_os: JSON.stringify(decision.targets.electronE2e),
    full: String(decision.scope === "full"),
    reason: decision.reason,
    run_browser_playwright: String(decision.targets.browserPlaywright.length > 0),
    run_check: String(decision.targets.check),
    run_electron_e2e: String(decision.targets.electronE2e.length > 0),
    run_vscode_conversion: String(decision.targets.vscodeConversion.length > 0),
    run_vscode_core: String(decision.targets.vscodeCore.length > 0),
    scope: decision.scope,
    vscode_conversion_os: JSON.stringify(decision.targets.vscodeConversion),
    vscode_core_os: JSON.stringify(decision.targets.vscodeCore),
  };
  const contents = Object.entries(outputs)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");
  appendFileSync(outputPath, `${contents}\n`, "utf8");
}

function runCli() {
  const decision = classifyCiScope(createInputFromEnvironment(process.env));
  console.log(`[ci-scope] scope=${decision.scope} reason=${decision.reason}`);

  try {
    writeGitHubOutputs(process.env.GITHUB_OUTPUT, decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown output error";
    console.error(`[ci-scope] ${message}`);
    process.exitCode = 1;
  }
}

function isMainModule() {
  const entryPath = process.argv[1];
  if (entryPath === undefined) {
    return false;
  }
  return pathToFileURL(path.resolve(entryPath)).href === import.meta.url;
}

if (isMainModule()) {
  runCli();
}
