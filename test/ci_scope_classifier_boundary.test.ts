/* oxlint-disable vitest/expect-expect */

// Test target:
// - GitHub event、diff失敗、rename・削除・特殊pathのboundary contract
// - 判定不能な外部入力をthrowせずfull scopeへ倒すこと
//
// Mocked:
// - GitHub APIとgit diffは呼ばず、取得済みのeventとdiff結果を入力する
//
// Not tested:
// - GitHub Actions outputへの書き込み
// - 実際のgit diff引数とNUL区切りparser

import {
  assertDecision,
  assertFullWithoutThrow,
  changed,
  checkOnlyTargets,
  conversionTargets,
  createInput,
  fullTargets,
  loadClassifier,
  webviewTargets,
  type CiScopeInput,
  type ClassifyCiScope,
} from "./helpers/ci_scope_classifier_contract.js";

let classifyCiScope: ClassifyCiScope;

suite("CI scope classifierの境界入力", () => {
  suiteSetup(async () => {
    classifyCiScope = await loadClassifier();
  });

  test("通常pushのdocs-only変更でもdocs scopeにする", () => {
    assertDecision(
      classifyCiScope(
        createInput([changed("PROJECT_STATE.md")], {
          beforeSha: "1111111111111111111111111111111111111111",
          name: "push",
        }),
      ),
      "docs",
      checkOnlyTargets,
    );
  });

  test("変更fileが空ならfull scopeにする", () => {
    assertDecision(classifyCiScope(createInput([])), "full", fullTargets);
  });

  test("diff取得失敗なら変更fileを推測せずfull scopeにする", () => {
    const input: CiScopeInput = {
      diff: { status: "failed" },
      event: { name: "pull_request" },
    };

    assertDecision(classifyCiScope(input), "full", fullTargets);
  });

  test("初回pushは比較元がないためfull scopeにする", () => {
    assertDecision(
      classifyCiScope(
        createInput([changed("docs/tasks/example.md")], {
          beforeSha: "0000000000000000000000000000000000000000",
          name: "push",
        }),
      ),
      "full",
      fullTargets,
    );
  });

  test("renameでは変更前後のpathを分類する", () => {
    assertDecision(
      classifyCiScope(
        createInput([
          {
            path: "docs/crop-preview.md",
            previousPath: "webview/apps/crop_pdf/legacy_preview.ts",
            status: "renamed",
          },
        ]),
      ),
      "webview",
      webviewTargets,
    );
  });

  test("削除fileも削除前のpathで分類する", () => {
    assertDecision(
      classifyCiScope(
        createInput([
          {
            path: "src/commands/convert_to_png.ts",
            status: "deleted",
          },
        ]),
      ),
      "conversion",
      conversionTargets,
    );
  });

  for (const filePath of ["docs-old/example.md", "webview-old/App.tsx"]) {
    test(`${filePath}を既知scopeのprefixとして誤判定しない`, () => {
      assertDecision(classifyCiScope(createInput([changed(filePath)])), "full", fullTargets);
    });
  }

  for (const filePath of ["", "/tmp/outside.ts", "../outside.ts"]) {
    test(`${JSON.stringify(filePath)}をrepository内pathとして扱わない`, () => {
      assertDecision(classifyCiScope(createInput([changed(filePath)])), "full", fullTargets);
    });
  }

  test("空白・Unicode・改行を含むpathを1つのdocs fileとして扱う", () => {
    assertDecision(
      classifyCiScope(createInput([changed("docs/CI 設計 🌹\n続き.md")])),
      "docs",
      checkOnlyTargets,
    );
  });

  test("malformed inputをthrowせずfull scopeへ倒す", () => {
    assertFullWithoutThrow(classifyCiScope, null);
    assertFullWithoutThrow(classifyCiScope, {});
    assertFullWithoutThrow(classifyCiScope, {
      diff: { files: "not-an-array", status: "ok" },
    });
  });

  test("循環参照を含むinputをthrowせずfull scopeへ倒す", () => {
    const circularInput: Record<string, unknown> = {};
    circularInput.self = circularInput;

    assertFullWithoutThrow(classifyCiScope, circularInput);
  });

  test("property accessが失敗するhostile inputをthrowせずfull scopeへ倒す", () => {
    const hostileInput = new Proxy(
      {},
      {
        get() {
          throw new Error("hostile getter");
        },
      },
    );

    assertFullWithoutThrow(classifyCiScope, hostileInput);
  });
});
