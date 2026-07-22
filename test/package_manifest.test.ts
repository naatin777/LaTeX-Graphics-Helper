import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PUBLIC_COMMAND_IDS } from '../src/extension.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONVERT_TO_PDF_COMMAND = 'latex-graphics-helper.convertToPdf';
const CONVERT_TO_PNG_COMMAND = 'latex-graphics-helper.convertToPng';
const CONVERT_TO_JPEG_COMMAND = 'latex-graphics-helper.convertToJpeg';
const CONVERT_TO_WEBP_COMMAND = 'latex-graphics-helper.convertToWebp';
const CONVERT_TO_AVIF_COMMAND = 'latex-graphics-helper.convertToAvif';
const CONVERT_TO_SVG_COMMAND = 'latex-graphics-helper.convertToSvg';
const CONVERT_DRAWIO_TO_PDF_COMMAND = 'latex-graphics-helper.convertDrawioToPdf';
const CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND = 'latex-graphics-helper.convertDrawioToPdfDirectly';
const COMBINE_IMAGES_TO_SINGLE_PDF_COMMAND = 'latex-graphics-helper.convertImagesToSinglePdf';
const CONVERT_SUBMENU = 'latex-graphics-helper.convert';
const CONTEXT_MENU_ENABLED = 'config.latex-graphics-helper.contextMenu.enabled';
const COMPOUND_DRAWIO_MATCH = 'resourceFilename =~ /\\.(drawio|dio)\\.(png|svg)$/i';
const COMPOUND_DRAWIO_NOT_MATCH = `!(${COMPOUND_DRAWIO_MATCH})`;
const CONVERSION_CONTEXT_MENU_SETTINGS = {
  drawio: {
    property: 'latex-graphics-helper.contextMenu.convertDrawio.enabled',
    description: 'config.contextMenu.convertDrawio.enabled',
  },
  pdf: {
    property: 'latex-graphics-helper.contextMenu.convertPdf.enabled',
    description: 'config.contextMenu.convertPdf.enabled',
  },
  png: {
    property: 'latex-graphics-helper.contextMenu.convertPng.enabled',
    description: 'config.contextMenu.convertPng.enabled',
  },
  jpeg: {
    property: 'latex-graphics-helper.contextMenu.convertJpeg.enabled',
    description: 'config.contextMenu.convertJpeg.enabled',
  },
  webp: {
    property: 'latex-graphics-helper.contextMenu.convertWebp.enabled',
    description: 'config.contextMenu.convertWebp.enabled',
  },
  avif: {
    property: 'latex-graphics-helper.contextMenu.convertAvif.enabled',
    description: 'config.contextMenu.convertAvif.enabled',
  },
  svg: {
    property: 'latex-graphics-helper.contextMenu.convertSvg.enabled',
    description: 'config.contextMenu.convertSvg.enabled',
  },
  mermaid: {
    property: 'latex-graphics-helper.contextMenu.convertMermaid.enabled',
    description: 'config.contextMenu.convertMermaid.enabled',
  },
} as const;
const UNIMPLEMENTED_MANUAL_COMMANDS = [
  'latex-graphics-helper.splitPdf.manual',
  'latex-graphics-helper.mergePdf.manual',
] as const;
const LEGACY_TO_PDF_COMMANDS = [
  'latex-graphics-helper.convertPngToPdf',
  'latex-graphics-helper.convertJpegToPdf',
  'latex-graphics-helper.convertWebpToPdf',
  'latex-graphics-helper.convertAvifToPdf',
  'latex-graphics-helper.convertSvgToPdf',
] as const;

interface PackageJson {
  activationEvents?: string[];
  contributes: {
    commands: { command: string; title: string }[];
    configuration: {
      properties: Record<
        string,
        {
          type: string;
          default: unknown;
          minimum?: number;
          maximum?: number;
          description: string;
        }
      >;
    };
    menus: Record<string, { command?: string; submenu?: string; when?: string }[]>;
    submenus: { id: string; label: string }[];
  };
}

suite('package.jsonの変換メニュー定義', () => {
  test('公開command・menu・extension登録のID一覧が整合する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const manifestCommandIds = new Set(packageJson.contributes.commands.map((command) => command.command));
    const menuCommandIds = new Set(
      Object.values(packageJson.contributes.menus)
        .flatMap((entries) => entries.map((entry) => entry.command))
        .filter((command): command is string => command !== undefined),
    );

    assert.deepStrictEqual(new Set(PUBLIC_COMMAND_IDS), manifestCommandIds);

    for (const menuCommandId of menuCommandIds) {
      assert.ok(manifestCommandIds.has(menuCommandId), `${menuCommandId} is not a public command`);
    }
  });

  test('未実装のmanual PDFコマンドを公開しない', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const commandIds = new Set(packageJson.contributes.commands.map((command) => command.command));
    const menuCommandIds = new Set(
      Object.values(packageJson.contributes.menus)
        .flatMap((entries) => entries.map((entry) => entry.command))
        .filter((command): command is string => command !== undefined),
    );

    for (const command of UNIMPLEMENTED_MANUAL_COMMANDS) {
      assert.ok(!commandIds.has(command), `${command} should not be public`);
      assert.ok(!menuCommandIds.has(command), `${command} should not be in menus`);
    }
  });

  test('PDFに変換コマンドだけを公開し、旧PDF変換コマンドは公開しない', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const commandIds = new Set(packageJson.contributes.commands.map((command) => command.command));

    assert.ok(commandIds.has(CONVERT_TO_PDF_COMMAND));

    for (const legacyCommand of LEGACY_TO_PDF_COMMANDS) {
      assert.ok(!commandIds.has(legacyCommand), `${legacyCommand} should not be public`);
    }
  });

  test('ネイティブDraw.io用のPDFコマンドと直接出力設定を公開する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const commandIds = new Set(packageJson.contributes.commands.map((command) => command.command));
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const properties = packageJson.contributes.configuration.properties;

    assert.ok(commandIds.has(CONVERT_DRAWIO_TO_PDF_COMMAND));
    assert.ok(commandIds.has(CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND));
    assert.ok(explorerContext.some((entry) => entry.command === CONVERT_DRAWIO_TO_PDF_COMMAND));
    assert.ok(explorerContext.some((entry) => entry.command === CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND));
    assert.strictEqual(
      properties['latex-graphics-helper.outputPath.convertDrawioToPdfDirectly']?.default,
      '${fileDirname}/${fileBasenameNoExtension}.pdf',
    );
  });

  test('入力形式別の変換コンテキストメニュー設定を公開する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const properties = packageJson.contributes.configuration.properties;

    for (const setting of Object.values(CONVERSION_CONTEXT_MENU_SETTINGS)) {
      assert.deepStrictEqual(properties[setting.property], {
        type: 'boolean',
        default: true,
        description: `%${setting.description}%`,
      });
    }
  });

  test('変換メニューの各入力形式を対応する設定で制御する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertSubmenu = explorerContext.find((entry) => entry.submenu === CONVERT_SUBMENU);
    const commandEntries = new Map(
      [...explorerContext, ...convertMenu]
        .filter((entry): entry is typeof entry & { command: string } => entry.command !== undefined)
        .map((entry) => [entry.command, entry]),
    );
    const expectedSettingsByCommand: Record<string, string[]> = {
      [CONVERT_TO_PDF_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.png.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.jpeg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.webp.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.avif.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_TO_PNG_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.pdf.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.jpeg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.webp.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.avif.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.svg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_TO_JPEG_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.pdf.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.png.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.webp.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.avif.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.svg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_TO_WEBP_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.pdf.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.png.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.jpeg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.avif.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.svg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_TO_AVIF_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.pdf.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.png.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.jpeg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.webp.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.svg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_TO_SVG_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.pdf.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.mermaid.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property,
      ],
      [CONVERT_DRAWIO_TO_PDF_COMMAND]: [CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property],
      [CONVERT_DRAWIO_TO_PDF_DIRECTLY_COMMAND]: [CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property],
      [COMBINE_IMAGES_TO_SINGLE_PDF_COMMAND]: [
        CONVERSION_CONTEXT_MENU_SETTINGS.png.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.jpeg.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.webp.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.avif.property,
        CONVERSION_CONTEXT_MENU_SETTINGS.svg.property,
      ],
    };

    assert.ok(convertSubmenu?.when?.includes(CONTEXT_MENU_ENABLED));
    for (const setting of Object.values(CONVERSION_CONTEXT_MENU_SETTINGS)) {
      assert.ok(convertSubmenu?.when?.includes(setting.property), `${setting.property} is not on the convert submenu`);
    }
    assert.ok(convertSubmenu?.when?.includes('resourceExtname =~ /^\\.(gif|tif|tiff|eps)$/i'));

    for (const [command, settings] of Object.entries(expectedSettingsByCommand)) {
      const entry = commandEntries.get(command);
      assert.ok(entry?.when?.includes(CONTEXT_MENU_ENABLED), `${command} does not preserve the global setting`);
      for (const setting of settings) {
        assert.ok(entry?.when?.includes(setting), `${setting} is not used by ${command}`);
      }
    }
  });

  test('画像を1つのPDFへ結合するコマンドを複合Draw.io画像から除外する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const combineImagesToSinglePdf = explorerContext.find(
      (entry) => entry.command === COMBINE_IMAGES_TO_SINGLE_PDF_COMMAND,
    );

    assert.ok(combineImagesToSinglePdf?.when?.includes(CONTEXT_MENU_ENABLED));
    assert.ok(combineImagesToSinglePdf?.when?.includes(COMPOUND_DRAWIO_NOT_MATCH));
    assert.ok(combineImagesToSinglePdf?.when?.includes('resourceExtname =~ /^\\.(gif|tif|tiff|eps)$/i'));
    assert.ok(!combineImagesToSinglePdf?.when?.includes(CONVERSION_CONTEXT_MENU_SETTINGS.drawio.property));
  });

  test('Explorerの変換サブメニューにPDFに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const submenu = packageJson.contributes.submenus.find((entry) => entry.id === CONVERT_SUBMENU);
    const convertToPdf = convertMenu.find((entry) => entry.command === CONVERT_TO_PDF_COMMAND);

    assert.strictEqual(submenu?.label, '%submenu.convert%');
    assert.ok(explorerContext.some((entry) => entry.submenu === CONVERT_SUBMENU));
    assert.ok(convertToPdf);
    assert.ok(convertToPdf.when?.includes('mmd'));
    assert.ok(convertToPdf.when?.includes('mermaid'));
    assert.ok(convertToPdf.when?.includes('drawio'));
    assert.ok(convertToPdf.when?.includes('dio'));

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes('resourceFilename') &&
          entry.when.includes('drawio') &&
          entry.when.includes('dio') &&
          entry.when.includes('png') &&
          entry.when.includes('svg'),
      ),
    );

    const menuCommandIds = new Set(
      Object.entries(packageJson.contributes.menus)
        .filter(([menuId]) => menuId !== 'commandPalette')
        .flatMap(([, entries]) => entries.map((entry) => entry.command))
        .filter((command): command is string => command !== undefined),
    );

    for (const legacyCommand of LEGACY_TO_PDF_COMMANDS) {
      assert.ok(!menuCommandIds.has(legacyCommand), `${legacyCommand} should not be in menus`);
    }
  });

  test('convertToPdfのcontext menu入力を大文字小文字非依存で判定する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
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

  test('変換サブメニューにSVGに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToSvg = convertMenu.find((entry) => entry.command === CONVERT_TO_SVG_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) => entry.submenu === CONVERT_SUBMENU && entry.when?.includes('mmd') && entry.when.includes('mermaid'),
      ),
    );
    assert.ok(convertToSvg);
    assert.ok(convertToSvg.when?.includes('pdf'));
    assert.ok(convertToSvg.when?.includes('mmd'));
    assert.ok(convertToSvg.when?.includes('mermaid'));
    assert.ok(convertToSvg.when?.includes('drawio'));
    assert.ok(convertToSvg.when?.includes('dio'));
  });

  test('変換サブメニューにPNGに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToPng = convertMenu.find((entry) => entry.command === CONVERT_TO_PNG_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes('mmd') &&
          entry.when.includes('mermaid') &&
          entry.when.includes('drawio') &&
          entry.when.includes('dio'),
      ),
    );
    assert.ok(convertToPng);
    assert.ok(convertToPng.when?.includes('pdf'));
    assert.ok(convertToPng.when?.includes('svg'));
    assert.ok(convertToPng.when?.includes('mmd'));
    assert.ok(convertToPng.when?.includes('mermaid'));
    assert.ok(convertToPng.when?.includes('jpg'));
    assert.ok(convertToPng.when?.includes('jpeg'));
    assert.ok(convertToPng.when?.includes('webp'));
    assert.ok(convertToPng.when?.includes('avif'));
    assert.ok(convertToPng.when?.includes('drawio'));
    assert.ok(convertToPng.when?.includes('dio'));
  });

  test('変換サブメニューにJPEGに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToJpeg = convertMenu.find((entry) => entry.command === CONVERT_TO_JPEG_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes('mmd') &&
          entry.when.includes('mermaid') &&
          entry.when.includes('drawio') &&
          entry.when.includes('dio'),
      ),
    );
    assert.ok(convertToJpeg);
    assert.ok(convertToJpeg.when?.includes('pdf'));
    assert.ok(convertToJpeg.when?.includes('png'));
    assert.ok(convertToJpeg.when?.includes('svg'));
    assert.ok(convertToJpeg.when?.includes('mmd'));
    assert.ok(convertToJpeg.when?.includes('mermaid'));
    assert.ok(convertToJpeg.when?.includes('webp'));
    assert.ok(convertToJpeg.when?.includes('avif'));
    assert.ok(convertToJpeg.when?.includes('drawio'));
    assert.ok(convertToJpeg.when?.includes('dio'));
  });

  test('変換サブメニューにWebPに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToWebp = convertMenu.find((entry) => entry.command === CONVERT_TO_WEBP_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes('mmd') &&
          entry.when.includes('mermaid') &&
          entry.when.includes('drawio') &&
          entry.when.includes('dio'),
      ),
    );
    assert.ok(convertToWebp);
    assert.ok(convertToWebp.when?.includes('pdf'));
    assert.ok(convertToWebp.when?.includes('png'));
    assert.ok(convertToWebp.when?.includes('jpg'));
    assert.ok(convertToWebp.when?.includes('jpeg'));
    assert.ok(convertToWebp.when?.includes('svg'));
    assert.ok(convertToWebp.when?.includes('mmd'));
    assert.ok(convertToWebp.when?.includes('mermaid'));
    assert.ok(convertToWebp.when?.includes('avif'));
    assert.ok(convertToWebp.when?.includes('drawio'));
    assert.ok(convertToWebp.when?.includes('dio'));
  });

  test('変換サブメニューにAVIFに変換コマンドを表示する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const explorerContext = packageJson.contributes.menus['explorer/context'] ?? [];
    const convertMenu = packageJson.contributes.menus[CONVERT_SUBMENU] ?? [];
    const convertToAvif = convertMenu.find((entry) => entry.command === CONVERT_TO_AVIF_COMMAND);

    assert.ok(
      explorerContext.some(
        (entry) =>
          entry.submenu === CONVERT_SUBMENU &&
          entry.when?.includes('mmd') &&
          entry.when.includes('mermaid') &&
          entry.when.includes('drawio') &&
          entry.when.includes('dio'),
      ),
    );
    assert.ok(convertToAvif);
    assert.ok(convertToAvif.when?.includes('pdf'));
    assert.ok(convertToAvif.when?.includes('png'));
    assert.ok(convertToAvif.when?.includes('jpg'));
    assert.ok(convertToAvif.when?.includes('jpeg'));
    assert.ok(convertToAvif.when?.includes('webp'));
    assert.ok(convertToAvif.when?.includes('svg'));
    assert.ok(convertToAvif.when?.includes('mmd'));
    assert.ok(convertToAvif.when?.includes('mermaid'));
    assert.ok(convertToAvif.when?.includes('drawio'));
    assert.ok(convertToAvif.when?.includes('dio'));
  });

  test('日本語の変換メニューには出力形式のラベルを使う', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const jaMessages = await readJson<Record<string, string>>('package.nls.ja.json');
    const convertToPdf = packageJson.contributes.commands.find((command) => command.command === CONVERT_TO_PDF_COMMAND);

    assert.strictEqual(convertToPdf?.title, '%command.convertToPdf%');
    assert.strictEqual(jaMessages['submenu.convert'], '変換');
    assert.strictEqual(jaMessages['command.convertToPdf'], 'PDF');
    assert.strictEqual(jaMessages['command.convertToPng'], 'PNG');
    assert.strictEqual(jaMessages['command.convertToJpeg'], 'JPEG');
    assert.strictEqual(jaMessages['command.convertToWebp'], 'WebP');
    assert.strictEqual(jaMessages['command.convertToAvif'], 'AVIF');
    assert.strictEqual(jaMessages['command.convertToSvg'], 'SVG');
  });

  test('英語と日本語のNLSキーが一致している', async () => {
    const enMessages = await readJson<Record<string, string>>('package.nls.json');
    const jaMessages = await readJson<Record<string, string>>('package.nls.ja.json');

    assert.deepStrictEqual(sortedKeys(jaMessages), sortedKeys(enMessages));
  });

  test('WebPとAVIFのeffort設定を公開する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const properties = packageJson.contributes.configuration.properties;

    assert.deepStrictEqual(properties['latex-graphics-helper.convertToWebp.effort'], {
      type: 'integer',
      default: 4,
      minimum: 0,
      maximum: 6,
      description: '%config.convertToWebp.effort%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.convertToAvif.effort'], {
      type: 'integer',
      default: 4,
      minimum: 0,
      maximum: 9,
      description: '%config.convertToAvif.effort%',
    });
  });

  test('LaTeX文書でdrag and drop / clipboard paste用に拡張機能を起動する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');

    assert.ok(packageJson.activationEvents?.includes('onLanguage:latex'));
  });

  test('LaTeX挿入用の出力先とsnippet候補設定を公開する', async () => {
    const packageJson = await readJson<PackageJson>('package.json');
    const properties = packageJson.contributes.configuration.properties;

    assert.deepStrictEqual(properties['latex-graphics-helper.outputPath.clipboardImage'], {
      type: 'string',
      default: '${fileDirname}/${dateNow}',
      description: '%config.outputPath.clipboardImage%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.figure.placementOptions'], {
      type: 'array',
      default: [
        '[H]',
        '[h]',
        '[t]',
        '[b]',
        '[p]',
        '[ht]',
        '[hb]',
        '[hp]',
        '[tb]',
        '[tp]',
        '[bp]',
        '[htb]',
        '[htp]',
        '[hbp]',
        '[tbp]',
        '[htbp]',
      ],
      description: '%config.figure.placementOptions%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.figure.alignmentOptions'], {
      type: 'array',
      default: ['\\centering', '\\raggedright', '\\raggedleft'],
      description: '%config.figure.alignmentOptions%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.figure.graphicsOptions'], {
      type: 'array',
      default: [
        '[width=1.0\\linewidth]',
        '[width=0.9\\linewidth]',
        '[width=0.8\\linewidth]',
        '[width=0.7\\linewidth]',
        '[width=0.6\\linewidth]',
        '[width=0.5\\linewidth]',
      ],
      description: '%config.figure.graphicsOptions%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.subfigure.verticalAlignmentOptions'], {
      type: 'array',
      default: ['[t]', '[c]', '[b]'],
      description: '%config.subfigure.verticalAlignmentOptions%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.subfigure.widthOptions'], {
      type: 'array',
      default: ['{0.45\\linewidth}', '{0.35\\linewidth}', '{0.25\\linewidth}', '{0.15\\linewidth}'],
      description: '%config.subfigure.widthOptions%',
    });
    assert.deepStrictEqual(properties['latex-graphics-helper.subfigure.spacingOptions'], {
      type: 'array',
      default: [
        '\\hspace{0.01\\linewidth}',
        '\\hspace{0.02\\linewidth}',
        '\\hspace{0.03\\linewidth}',
        '\\hspace{0.04\\linewidth}',
        '\\hspace{0.05\\linewidth}',
      ],
      description: '%config.subfigure.spacingOptions%',
    });
  });
});

async function readJson<T>(relativePath: string): Promise<T> {
  const content = await readFile(path.join(repositoryRoot, relativePath), 'utf8');
  return JSON.parse(content) as T;
}

function sortedKeys(record: Record<string, string>): string[] {
  const keys = Object.keys(record);
  // 比較用の一時配列だけを並び替えるため、呼び出し元の値は変更しない。
  // oxlint-disable-next-line unicorn/no-array-sort
  return keys.sort();
}
