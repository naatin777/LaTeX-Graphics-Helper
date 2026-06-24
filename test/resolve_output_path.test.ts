/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import path from "node:path";

import { resolveOutputPath } from "../src/config/resolve_output_path.js";

suite("resolveOutputPath", () => {
  test("expands source variables from the original PDF path", () => {
    const workspacePath = path.resolve(path.sep, "workspace");
    const sourcePath = path.join(workspacePath, "figures", "sample.pdf");

    const result = resolveOutputPath(
      "${fileDirname}/${fileBasenameNoExtension}-crop${fileExtname}",
      {
        workspacePath,
        workspaceName: "workspace",
        sourcePath,
        dateNow: 123,
      },
    );

    assert.strictEqual(result, path.join(workspacePath, "figures", "sample-crop.pdf"));
  });

  test("resolves relative output paths from the workspace", () => {
    const workspacePath = path.resolve(path.sep, "workspace");
    const sourcePath = path.join(workspacePath, "figures", "sample.pdf");

    const result = resolveOutputPath("generated/${relativeFileDirname}/${fileBasename}", {
      workspacePath,
      workspaceName: "workspace",
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, "generated", "figures", "sample.pdf"));
  });

  test("does not expand template syntax contained in a file name", () => {
    const workspacePath = path.resolve(path.sep, "workspace");
    const sourcePath = path.join(workspacePath, "figures", "${fileExtname}.pdf");

    const result = resolveOutputPath("${fileBasenameNoExtension}-crop${fileExtname}", {
      workspacePath,
      workspaceName: "workspace",
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, "${fileExtname}-crop.pdf"));
  });

  test("rejects unsupported template variables", () => {
    const workspacePath = path.resolve(path.sep, "workspace");

    assert.throws(
      () =>
        resolveOutputPath("${unknown}/result.pdf", {
          workspacePath,
          workspaceName: "workspace",
          sourcePath: path.join(workspacePath, "sample.pdf"),
        }),
      /Unsupported output path variable/,
    );
  });
});
