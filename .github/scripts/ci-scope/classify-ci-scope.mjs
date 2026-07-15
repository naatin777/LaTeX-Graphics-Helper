const ZERO_SHA = "0000000000000000000000000000000000000000";
const ALL_OPERATING_SYSTEMS = ["linux", "macos", "windows"];

const TARGETS_BY_SCOPE = {
  "ai-rules": createTargets(),
  conversion: createTargets({
    vscodeConversion: ALL_OPERATING_SYSTEMS,
    vscodeCore: ALL_OPERATING_SYSTEMS,
  }),
  docs: createTargets(),
  "extension-core": createTargets({ vscodeCore: ["linux"] }),
  full: createTargets({
    browserPlaywright: ALL_OPERATING_SYSTEMS,
    electronE2e: ["linux"],
    vscodeConversion: ALL_OPERATING_SYSTEMS,
    vscodeCore: ALL_OPERATING_SYSTEMS,
  }),
  webview: createTargets({
    browserPlaywright: ALL_OPERATING_SYSTEMS,
    electronE2e: ["linux"],
  }),
};

const FULL_SCOPE_FILES = new Set([
  ".npmrc",
  ".vscode-test.mjs",
  "package.json",
  "playwright.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
]);
const DOCS_FILES = new Set(["CHANGELOG.md", "PROJECT_STATE.md"]);
const AI_RULE_FILES = new Set(["AGENTS.md", "CLAUDE.md", "rulesync.jsonc"]);
const WEBVIEW_HOST_FILES = new Set(["src/commands/crop_pdf_configure.ts"]);
const EXTENSION_CORE_FILES = new Set([
  "src/commands/progress_cancellation.ts",
  "src/commands/safe_mode.ts",
  "src/commands/user_messages.ts",
  "src/extension.ts",
  "src/locale_map.ts",
]);
const EXTENSION_CORE_DIRECTORIES = ["src/application", "src/edit_provider", "src/security"];
const CHANGE_STATUSES = new Set(["added", "deleted", "modified", "renamed"]);
const CONVERSION_FILE_TOKENS = [
  "commit_conversion",
  "convert",
  "crop",
  "drawio",
  "external_tool",
  "merge",
  "mermaid",
  "output_path",
  "pdftocairo",
  "resolve_output_path",
  "rsvg",
  "split",
];

export function classifyCiScope(input) {
  try {
    return classifyInput(input);
  } catch {
    return createDecision("full", "invalid-input");
  }
}

function classifyInput(input) {
  if (!isRecord(input) || !isRecord(input.event) || !isRecord(input.diff)) {
    return createDecision("full", "invalid-input");
  }

  const eventDecision = validateEvent(input.event);
  if (eventDecision !== undefined) {
    return eventDecision;
  }

  if (input.diff.status === "failed") {
    return createDecision("full", "diff-failed");
  }
  if (input.diff.status !== "ok" || !Array.isArray(input.diff.files)) {
    return createDecision("full", "invalid-diff");
  }
  if (input.diff.files.length === 0) {
    return createDecision("full", "empty-diff");
  }

  const scopes = new Set();
  for (const changedFile of input.diff.files) {
    const filePaths = readChangedFilePaths(changedFile);
    if (filePaths === undefined) {
      return createDecision("full", "invalid-changed-file");
    }

    for (const filePath of filePaths) {
      const scope = classifyPath(filePath);
      if (scope === "full") {
        return createDecision("full", "full-required-path");
      }
      scopes.add(scope);
    }
  }

  const nonDocsScopes = [...scopes].filter((scope) => scope !== "docs");
  if (nonDocsScopes.length === 0) {
    return createDecision("docs", "docs-only");
  }
  if (nonDocsScopes.length > 1) {
    return createDecision("full", "multiple-non-docs-scopes");
  }

  const scope = nonDocsScopes[0];
  return createDecision(scope, `${scope}-only`);
}

function validateEvent(event) {
  if (event.name === "pull_request") {
    return undefined;
  }
  if (event.name !== "push" || !isCommitSha(event.beforeSha)) {
    return createDecision("full", "invalid-event");
  }
  if (event.beforeSha === ZERO_SHA) {
    return createDecision("full", "initial-push");
  }
  return undefined;
}

function readChangedFilePaths(changedFile) {
  if (!isRecord(changedFile) || !CHANGE_STATUSES.has(changedFile.status)) {
    return undefined;
  }
  if (!isRepositoryRelativePath(changedFile.path)) {
    return undefined;
  }
  if (changedFile.status !== "renamed") {
    return [changedFile.path];
  }
  if (!isRepositoryRelativePath(changedFile.previousPath)) {
    return undefined;
  }
  return [changedFile.previousPath, changedFile.path];
}

function classifyPath(filePath) {
  if (FULL_SCOPE_FILES.has(filePath) || isWithinDirectory(filePath, ".github")) {
    return "full";
  }
  if (isDocsPath(filePath)) {
    return "docs";
  }
  if (isAiRulePath(filePath)) {
    return "ai-rules";
  }
  if (isWebviewPath(filePath)) {
    return "webview";
  }
  if (isConversionPath(filePath)) {
    return "conversion";
  }
  if (isExtensionCorePath(filePath)) {
    return "extension-core";
  }
  if (isWithinDirectory(filePath, "scripts")) {
    return "full";
  }
  return "full";
}

function isDocsPath(filePath) {
  return (
    DOCS_FILES.has(filePath) ||
    (!filePath.includes("/") && filePath.startsWith("README") && filePath.endsWith(".md")) ||
    isWithinDirectory(filePath, "docs")
  );
}

function isAiRulePath(filePath) {
  return (
    AI_RULE_FILES.has(filePath) ||
    [".agents", ".codex", ".rulesync"].some((directory) => isWithinDirectory(filePath, directory))
  );
}

function isWebviewPath(filePath) {
  return (
    WEBVIEW_HOST_FILES.has(filePath) ||
    isWithinDirectory(filePath, "webview") ||
    isWithinDirectory(filePath, "src/presentation/webview")
  );
}

function isConversionPath(filePath) {
  if (!isWithinDirectory(filePath, "src")) {
    return false;
  }
  const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
  return CONVERSION_FILE_TOKENS.some((token) => fileName.includes(token));
}

function isExtensionCorePath(filePath) {
  return (
    EXTENSION_CORE_FILES.has(filePath) ||
    EXTENSION_CORE_DIRECTORIES.some((directory) => isWithinDirectory(filePath, directory))
  );
}

function isRepositoryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    return false;
  }
  if (value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(value)) {
    return false;
  }
  if (value.includes("\\")) {
    return false;
  }

  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isWithinDirectory(filePath, directory) {
  return filePath.startsWith(`${directory}/`);
}

function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function createDecision(scope, reason) {
  return {
    reason,
    scope,
    targets: cloneTargets(TARGETS_BY_SCOPE[scope]),
  };
}

function createTargets(overrides = {}) {
  return {
    browserPlaywright: overrides.browserPlaywright ?? [],
    check: true,
    electronE2e: overrides.electronE2e ?? [],
    vscodeConversion: overrides.vscodeConversion ?? [],
    vscodeCore: overrides.vscodeCore ?? [],
  };
}

function cloneTargets(targets) {
  return {
    browserPlaywright: [...targets.browserPlaywright],
    check: targets.check,
    electronE2e: [...targets.electronE2e],
    vscodeConversion: [...targets.vscodeConversion],
    vscodeCore: [...targets.vscodeCore],
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}
