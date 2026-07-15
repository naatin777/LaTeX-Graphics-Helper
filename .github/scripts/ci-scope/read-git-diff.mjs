import { spawnSync } from "node:child_process";

const ZERO_SHA = "0000000000000000000000000000000000000000";

export function createInputFromEnvironment(environment) {
  const eventName = environment.GITHUB_EVENT_NAME;
  const headSha = environment.GITHUB_SHA;

  if (eventName === "pull_request") {
    const baseRef = environment.GITHUB_BASE_REF;
    const event = { name: "pull_request" };
    if (!isSafeRef(baseRef) || !isCommitSha(headSha)) {
      return { diff: { status: "failed" }, event };
    }
    return { diff: readGitDiff(`origin/${baseRef}...${headSha}`), event };
  }

  if (eventName === "push") {
    const beforeSha = environment.EVENT_BEFORE;
    const event = { beforeSha, name: "push" };
    if (!isCommitSha(beforeSha) || !isCommitSha(headSha)) {
      return { diff: { status: "failed" }, event };
    }
    if (beforeSha === ZERO_SHA) {
      return { diff: { files: [], status: "ok" }, event };
    }
    return { diff: readGitDiff(`${beforeSha}..${headSha}`), event };
  }

  return { diff: { status: "failed" }, event: { name: eventName } };
}

function isSafeRef(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("-") &&
    !/[\0\r\n]/.test(value)
  );
}

function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function readGitDiff(revisionRange) {
  const result = spawnSync(
    "git",
    ["diff", "--name-status", "-z", "--find-renames", "--end-of-options", revisionRange],
    { maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.error !== undefined || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    return { status: "failed" };
  }

  const files = parseNameStatus(result.stdout.toString("utf8"));
  return files === undefined ? { status: "failed" } : { files, status: "ok" };
}

export function parseNameStatus(output) {
  const tokens = output.split("\0");
  if (tokens.at(-1) === "") {
    tokens.pop();
  }

  const files = [];
  for (let index = 0; index < tokens.length; ) {
    const gitStatus = tokens[index];
    index += 1;

    if (isRenameStatus(gitStatus)) {
      const previousPath = tokens[index];
      const filePath = tokens[index + 1];
      index += 2;
      if (previousPath === undefined || filePath === undefined) {
        return undefined;
      }
      files.push({ path: filePath, previousPath, status: "renamed" });
      continue;
    }

    const status = { A: "added", D: "deleted", M: "modified" }[gitStatus];
    const filePath = tokens[index];
    index += 1;
    if (status === undefined || filePath === undefined) {
      return undefined;
    }
    files.push({ path: filePath, status });
  }
  return files;
}

function isRenameStatus(value) {
  const match = /^R(\d{1,3})$/.exec(value);
  return match !== null && Number(match[1]) <= 100;
}
