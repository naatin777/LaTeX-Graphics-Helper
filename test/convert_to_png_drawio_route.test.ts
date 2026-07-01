/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

suite("PNGに変換するDraw.io経路", () => {
  test("Draw.io CLIへPNG直接出力を要求せずPDFを経由する", async () => {
    const source = await readFile(
      path.join(repositoryRoot, "src", "operations", "convert_to_png.ts"),
      "utf8",
    );

    assert.match(source, /drawio/i);
    assert.match(source, /pdf/i);
    assert.doesNotMatch(source, /["']-f["']\s*,\s*["']png["']/i);
    assert.doesNotMatch(source, /["']--format=png["']/i);
    assert.doesNotMatch(source, /--format[=\s]+png/i);
  });
});
