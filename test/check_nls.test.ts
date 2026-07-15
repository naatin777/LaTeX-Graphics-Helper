/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = path.join(process.cwd(), "scripts", "check-nls.mjs");

suite("NLS consistency check", () => {
  test("英日NLSのkeyとplaceholderを検証できる", async () => {
    const result = await execFileAsync(process.execPath, [scriptPath], { cwd: process.cwd() });
    assert.match(result.stdout, /NLS consistency OK/);
    assert.strictEqual(result.stderr, "");
  });
});
