/* oxlint-disable vitest/expect-expect */

// Test target:
// - 変更fileの分類から必要なCI jobとOSを決めるcontract
//
// Mocked:
// - GitHub APIとgit diffは呼ばず、取得済みの変更file一覧を入力する
//
// Not tested:
// - GitHub Actions outputへの書き込み
// - workflowのjob-level ifとrequired check設定
// - VS Code testのcore / conversion分割

import {
  assertDecision,
  changed,
  checkOnlyTargets,
  conversionTargets,
  createInput,
  extensionCoreTargets,
  fullTargets,
  loadClassifier,
  webviewTargets,
  type ClassifyCiScope,
} from "./helpers/ci_scope_classifier_contract.js";

let classifyCiScope: ClassifyCiScope;

suite("CI scope classifier", () => {
  suiteSetup(async () => {
    classifyCiScope = await loadClassifier();
  });

  test("PRのdocs-only変更ではcheck以外の重いjobを要求しない", () => {
    assertDecision(
      classifyCiScope(
        createInput([
          changed("docs/tasks/example.md"),
          changed("README.ja.md"),
          changed("CHANGELOG.md"),
        ]),
      ),
      "docs",
      checkOnlyTargets,
    );
  });

  test("AI rule変更ではcheckだけを要求する", () => {
    assertDecision(
      classifyCiScope(createInput([changed(".agents/skills/lgh-task-runner/SKILL.md")])),
      "ai-rules",
      checkOnlyTargets,
    );
  });

  test("Webview変更では3 OSのbrowser testとLinux Electron E2Eを要求する", () => {
    assertDecision(
      classifyCiScope(createInput([changed("webview/apps/crop_pdf/App.tsx")])),
      "webview",
      webviewTargets,
    );
  });

  test("extension core変更ではLinuxのcore testを要求する", () => {
    assertDecision(
      classifyCiScope(createInput([changed("src/extension.ts")])),
      "extension-core",
      extensionCoreTargets,
    );
  });

  test("変換処理変更では3 OSのcore・conversion testを要求する", () => {
    assertDecision(
      classifyCiScope(createInput([changed("src/operations/convert_to_png.ts")])),
      "conversion",
      conversionTargets,
    );
  });

  test("外部CLI wrapper変更をconversion scopeにする", () => {
    assertDecision(
      classifyCiScope(
        createInput([changed("src/operations/run_pdftocairo_with_ascii_scratch.ts")]),
      ),
      "conversion",
      conversionTargets,
    );
  });

  for (const filePath of [
    "package.json",
    "pnpm-lock.yaml",
    ".npmrc",
    ".github/workflows/test.yml",
    ".github/scripts/install-test-tools-linux.sh",
  ]) {
    test(`${filePath}の変更ではfull scopeにする`, () => {
      assertDecision(classifyCiScope(createInput([changed(filePath)])), "full", fullTargets);
    });
  }

  test("分類表にないfileはfull scopeにする", () => {
    assertDecision(
      classifyCiScope(createInput([changed("assets/new-runtime-asset.bin")])),
      "full",
      fullTargets,
    );
  });

  test("複数の非docs scopeにまたがる変更はfull scopeにする", () => {
    assertDecision(
      classifyCiScope(
        createInput([changed("src/extension.ts"), changed("webview/apps/crop_pdf/App.tsx")]),
      ),
      "full",
      fullTargets,
    );
  });

  test("docsと単一の非docs scopeの組み合わせは非docs側へ寄せる", () => {
    assertDecision(
      classifyCiScope(
        createInput([
          changed("docs/tasks/example.md"),
          changed("src/operations/convert_to_png.ts"),
        ]),
      ),
      "conversion",
      conversionTargets,
    );
  });
});
