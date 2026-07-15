import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type ChangeStatus = "added" | "deleted" | "modified" | "renamed";
export type CiScope = "ai-rules" | "conversion" | "docs" | "extension-core" | "full" | "webview";
export type OperatingSystem = "linux" | "macos" | "windows";

export interface ChangedFile {
  path: string;
  previousPath?: string;
  status: ChangeStatus;
}

export interface CiScopeInput {
  diff:
    | { files: ChangedFile[]; status: "ok" }
    | {
        status: "failed";
      };
  event:
    | { name: "pull_request" }
    | {
        beforeSha: string;
        name: "push";
      };
}

export interface CiTargetMatrix {
  browserPlaywright: OperatingSystem[];
  check: boolean;
  electronE2e: OperatingSystem[];
  vscodeConversion: OperatingSystem[];
  vscodeCore: OperatingSystem[];
}

export interface CiScopeDecision {
  reason: string;
  scope: CiScope;
  targets: CiTargetMatrix;
}

export type ClassifyCiScope = (input: unknown) => CiScopeDecision;
export type ParseNameStatus = (output: string) => ChangedFile[] | undefined;

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const classifierUrl = pathToFileURL(
  path.join(repositoryRoot, ".github", "scripts", "detect-ci-scope.mjs"),
).href;
const gitDiffReaderUrl = pathToFileURL(
  path.join(repositoryRoot, ".github", "scripts", "ci-scope", "read-git-diff.mjs"),
).href;
const allOperatingSystems: OperatingSystem[] = ["linux", "macos", "windows"];

export const checkOnlyTargets: CiTargetMatrix = {
  browserPlaywright: [],
  check: true,
  electronE2e: [],
  vscodeConversion: [],
  vscodeCore: [],
};
export const webviewTargets: CiTargetMatrix = {
  browserPlaywright: allOperatingSystems,
  check: true,
  electronE2e: ["linux"],
  vscodeConversion: [],
  vscodeCore: [],
};
export const extensionCoreTargets: CiTargetMatrix = {
  browserPlaywright: [],
  check: true,
  electronE2e: [],
  vscodeConversion: [],
  vscodeCore: ["linux"],
};
export const conversionTargets: CiTargetMatrix = {
  browserPlaywright: [],
  check: true,
  electronE2e: [],
  vscodeConversion: allOperatingSystems,
  vscodeCore: allOperatingSystems,
};
export const fullTargets: CiTargetMatrix = {
  browserPlaywright: allOperatingSystems,
  check: true,
  electronE2e: ["linux"],
  vscodeConversion: allOperatingSystems,
  vscodeCore: allOperatingSystems,
};

export async function loadClassifier(): Promise<ClassifyCiScope> {
  const classifierModule: unknown = await import(classifierUrl);
  assert.ok(isRecord(classifierModule));
  assert.strictEqual(typeof classifierModule.classifyCiScope, "function");
  return classifierModule.classifyCiScope as ClassifyCiScope;
}

export async function loadNameStatusParser(): Promise<ParseNameStatus> {
  const gitDiffReaderModule: unknown = await import(gitDiffReaderUrl);
  assert.ok(isRecord(gitDiffReaderModule));
  assert.strictEqual(typeof gitDiffReaderModule.parseNameStatus, "function");
  return gitDiffReaderModule.parseNameStatus as ParseNameStatus;
}

export function changed(filePath: string): ChangedFile {
  return { path: filePath, status: "modified" };
}

export function createInput(
  files: ChangedFile[],
  event: CiScopeInput["event"] = { name: "pull_request" },
): CiScopeInput {
  return {
    diff: { files, status: "ok" },
    event,
  };
}

export function assertDecision(
  actual: CiScopeDecision,
  expectedScope: CiScope,
  expectedTargets: CiTargetMatrix,
): void {
  assert.strictEqual(actual.scope, expectedScope);
  assert.deepStrictEqual(actual.targets, expectedTargets);
  assert.strictEqual(typeof actual.reason, "string");
  assert.ok(actual.reason.trim().length > 0);
}

export function assertFullWithoutThrow(classifyCiScope: ClassifyCiScope, input: unknown): void {
  let decision: CiScopeDecision | undefined;

  assert.doesNotThrow(() => {
    decision = classifyCiScope(input);
  });
  assertDecision(assertDefined(decision), "full", fullTargets);
}

function assertDefined<T>(value: T | undefined): T {
  assert.notStrictEqual(value, undefined);
  return value as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
