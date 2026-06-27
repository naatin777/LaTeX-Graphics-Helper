/* oxlint-disable vitest/expect-expect */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const CONVERT_TO_PDF_COMMAND = "latex-graphics-helper.convertToPdf";
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
    menus: Record<string, { command?: string; submenu?: string }[]>;
    submenus: { id: string; label: string }[];
  };
}

suite("package manifest conversion menu", () => {
  test("keeps convertToPdf public and hides legacy PDF conversion commands from public commands", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const commandIds = new Set(packageJson.contributes.commands.map((command) => command.command));

    assert.ok(commandIds.has(CONVERT_TO_PDF_COMMAND));

    for (const legacyCommand of LEGACY_TO_PDF_COMMANDS) {
      assert.ok(!commandIds.has(legacyCommand), `${legacyCommand} should not be public`);
    }
  });

  test("shows convertToPdf under a shared Convert submenu in Explorer context menu", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const explorerContext = packageJson.contributes.menus["explorer/context"] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const submenu = packageJson.contributes.submenus.find((entry) => entry.id === CONVERT_SUBMENU);

    assert.strictEqual(submenu?.label, "%submenu.convert%");
    assert.ok(explorerContext.some((entry) => entry.submenu === CONVERT_SUBMENU));
    assert.ok(convertMenu.some((entry) => entry.command === CONVERT_TO_PDF_COMMAND));

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

  test("uses output-format labels for the Japanese Convert menu", async () => {
    const packageJson = await readJson<PackageJson>("package.json");
    const jaMessages = await readJson<Record<string, string>>("package.nls.ja.json");
    const convertToPdf = packageJson.contributes.commands.find(
      (command) => command.command === CONVERT_TO_PDF_COMMAND,
    );

    assert.strictEqual(convertToPdf?.title, "%command.convertToPdf%");
    assert.strictEqual(jaMessages["submenu.convert"], "変換");
    assert.strictEqual(jaMessages["command.convertToPdf"], "PDF");
  });
});

async function readJson<T>(relativePath: string): Promise<T> {
  const content = await readFile(path.join(repositoryRoot, relativePath), "utf8");
  return JSON.parse(content) as T;
}
