/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { filesHaveEqualContents, hashFile } from "../src/operations/file_content_hash.js";

suite("大きなファイルの内容比較", () => {
  test("streaming hashで同一内容と相違内容を判定する", async () => {
    const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lgh-hash-test-"));
    const firstPath = path.join(workspacePath, "first.bin");
    const secondPath = path.join(workspacePath, "second.bin");
    const differentPath = path.join(workspacePath, "different.bin");
    const contents = Buffer.alloc(1024 * 1024, 0x61);

    await mkdir(workspacePath, { recursive: true });
    await writeFile(firstPath, contents);
    await writeFile(secondPath, contents);
    await writeFile(differentPath, Buffer.concat([contents, Buffer.from([0x62])]));

    assert.strictEqual(await hashFile(firstPath), await hashFile(secondPath));
    assert.strictEqual(await filesHaveEqualContents(firstPath, secondPath), true);
    assert.strictEqual(await filesHaveEqualContents(firstPath, differentPath), false);
    assert.strictEqual((await readFile(firstPath)).length, contents.length);

    await rm(workspacePath, { recursive: true, force: true });
  });
});
