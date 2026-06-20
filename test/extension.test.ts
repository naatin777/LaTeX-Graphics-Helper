/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";

import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  test("extension is registered", () => {
    const extension = vscode.extensions.getExtension("naatin777.latex-graphics-helper");

    assert.ok(extension);
  });

  test("extension activates", async () => {
    const extension = vscode.extensions.getExtension("naatin777.latex-graphics-helper");

    assert.ok(extension);

    await extension.activate();

    assert.strictEqual(extension.isActive, true);
  });
});
