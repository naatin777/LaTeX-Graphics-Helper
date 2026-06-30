/* oxlint-disable vitest/expect-expect */

import assert from "node:assert/strict";
import path from "node:path";

import { resolveOutputPath } from "../src/config/resolve_output_path.js";

suite("出力パスのテンプレート解決", () => {
  test("元PDFパスからsource系変数を展開する", () => {
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

  test("相対出力パスをworkspace基準で解決する", () => {
    const workspacePath = path.resolve(path.sep, "workspace");
    const sourcePath = path.join(workspacePath, "figures", "sample.pdf");

    const result = resolveOutputPath("generated/${relativeFileDirname}/${fileBasename}", {
      workspacePath,
      workspaceName: "workspace",
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, "generated", "figures", "sample.pdf"));
  });

  test("ファイル名に含まれるテンプレート構文は再展開しない", () => {
    const workspacePath = path.resolve(path.sep, "workspace");
    const sourcePath = path.join(workspacePath, "figures", "${fileExtname}.pdf");

    const result = resolveOutputPath("${fileBasenameNoExtension}-crop${fileExtname}", {
      workspacePath,
      workspaceName: "workspace",
      sourcePath,
    });

    assert.strictEqual(result, path.join(workspacePath, "${fileExtname}-crop.pdf"));
  });

  test("未対応のテンプレート変数を拒否する", () => {
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
