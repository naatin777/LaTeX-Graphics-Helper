/* oxlint-disable vitest/expect-expect */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";
const CONVERT_TO_SVG_COMMAND = "latex-graphics-helper.convertToSvg";
const CONVERT_SUBMENU = "latex-graphics-helper.convert";
const LEGACY_TO_PDF_COMMANDS = [
  "latex-graphics-helper.convertDrawioToPdf",
  "latex-graphics-helper.convertPngToPdf",
  "latex-graphics-helper.convertJpegToPdf",
  "latex-graphics-helper.convertWebpToPdf",
  "latex-graphics-helper.convertAvifToPdf",
  "latex-graphics-helper.convertSvgToPdf",
] as const;

interface PackageJson {
  contributes: {
    commands: { command: string; title: string }[];
    menus: Record<string, { command?: string; submenu?: string; when?: string }[]>;
    submenus: { id: string; label: string }[];
  };
}

suite("package.jsonの変換メニュー定義", () => {
  test("PDFに変換コマンドだけを公開し、旧PDF変換コマンドは公開しない", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const commandIds = new Set(packageJson.contributes.commands.map((command) => command.command));

    assert.ok(commandIds.has(CONVERT_TO_PDF_COMMAND));

    for (const legacyCommand of LEGACY_TO_PDF_COMMANDS) {
      assert.ok(!commandIds.has(legacyCommand), `${legacyCommand} should not be public`);
    }
  });

  test("Explorerの変換サブメニューにPDFに変換コマンドを表示する", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const explorerContext = packageJson.contributes.menus["explorer/context"] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const submenu = packageJson.contributes.submenus.find((entry) => entry.id === CONVERT_SUBMENU);
    const convertToPdf = convertMenu.find((entry) => entry.command === CONVERT_TO_PDF_COMMAND);

    assert.strictEqual(submenu?.label, "%submenu.convert%");
    assert.ok(explorerContext.some((entry) => entry.submenu === CONVERT_SUBMENU));
    assert.ok(convertToPdf);
    assert.ok(convertToPdf.when?.includes("mmd"));
    assert.ok(convertToPdf.when?.includes("mermaid"));
    assert.ok(convertToPdf.when?.includes("drawio"));
    assert.ok(convertToPdf.when?.includes("dio"));

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes("resourceFilename") &&
          entry.when.includes("drawio") &&
          entry.when.includes("dio") &&
          entry.when.includes("png") &&
          entry.when.includes("svg"),
      ),
    );

    const menuCommandIds = new Set(
      Object.entries(packageJson.contributes.menus)
        .filter(([menuId]) => menuId !== "commandPalette")
        .flatMap(([, entries]) => entries.map((entry) => entry.command))
        .filter((command): command is string => command !== undefined),
    );

    for (const legacyCommand of LEGACY_TO_PDF_COMMANDS) {
      assert.ok(!menuCommandIds.has(legacyCommand), `${legacyCommand} should not be in menus`);
    }
  });

  test("convertToPdfのcontext menu入力を大文字小文字非依存で判定する", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const explorerContext = packageJson.contributes.menus["explorer/context"] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertSubmenu = explorerContext.find((entry) => entry.submenu === CONVERT_SUBMENU);
    const convertToPdf = convertMenu.find((entry) => entry.command === CONVERT_TO_PDF_COMMAND);

    assert.ok(convertSubmenu?.when);
    assert.ok(convertToPdf?.when);

    for (const whenClause of [convertSubmenu.when, convertToPdf.when]) {
      assert.match(whenClause, /resourceExtname =~ \/.+\/i/);
      assert.match(whenClause, /resourceFilename =~ \/.+\/i/);
    }
  });

  test("Mermaidファイルでは変換サブメニューにSVGに変換コマンドを表示する", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const explorerContext = packageJson.contributes.menus["explorer/context"] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToSvg = convertMenu.find((entry) => entry.command === CONVERT_TO_SVG_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes("mmd") &&
          entry.when.includes("mermaid"),
      ),
    );
    assert.ok(convertToSvg);
    assert.ok(convertToSvg.when?.includes("mmd"));
    assert.ok(convertToSvg.when?.includes("mermaid"));
  });

  test("日本語の変換メニューには出力形式のラベルを使う", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const jaMessages = await readJson<Record<string, string>>("package.nls.ja.json");
    const convertToPdf = packageJson.contributes.commands.find(
      (command) => command.command === CONVERT_TO_PDF_COMMAND,
    );

    assert.strictEqual(convertToPdf?.title, "%command.convertToPdf%");
    assert.strictEqual(jaMessages["submenu.convert"], "変換");
    assert.strictEqual(jaMessages["command.convertToPdf"], "PDF");
    assert.strictEqual(jaMessages["command.convertToSvg"], "SVG");
  });
});

async function readJson<T>(relativePath: string): Promise<T> {
  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  return JSON.parse(content) as T;
}
