/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";

import {
  isEditableDrawioImagePath,
  logicalSourcePathForOutputTemplate,
  sourceFormatForPath,
} from "../src/application/source_format.js";

suite("source format判定", () => {
  test("拡張子とeditable Draw.io compound extensionを一元判定する", () => {
    assert.strictEqual(sourceFormatForPath("diagram.DIO.SVG"), "editable-drawio-svg");
    assert.strictEqual(sourceFormatForPath("image.JPEG"), "jpeg");
    assert.strictEqual(sourceFormatForPath("chart.mermaid"), "mermaid");
    assert.strictEqual(sourceFormatForPath("notes.txt"), undefined);
    assert.strictEqual(isEditableDrawioImagePath("diagram.drawio.png"), true);
    assert.strictEqual(logicalSourcePathForOutputTemplate("diagram.drawio.png"), "diagram");
  });
});
