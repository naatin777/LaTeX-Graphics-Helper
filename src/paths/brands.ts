import type {
    BitmapPath,
    BitmapType,
    DrawioPath,
    ExecutablePath,
    JpegPath,
    JpegTemplatePath,
    PdfPath,
    PdfTemplatePath,
    PngPath,
    PngTemplatePath,
    SvgPath,
    SvgTemplatePath,
    TemplatePath,
} from '../type';

const brand = <T extends string>(value: string): T => value as T;

export const executablePath = (value: string): ExecutablePath => brand(value);
export const drawioPath = (value: string): DrawioPath => brand(value);
export const pdfPath = (value: string): PdfPath => brand(value);
export const pngPath = (value: string): PngPath => brand(value);
export const jpegPath = (value: string): JpegPath => brand(value);
export const svgPath = (value: string): SvgPath => brand(value);

export const bitmapPath = (value: string, type: BitmapType): BitmapPath =>
    type === 'jpeg' ? jpegPath(value) : pngPath(value);

export const pdfTemplatePath = (value: string): PdfTemplatePath => brand(value);
export const pngTemplatePath = (value: string): PngTemplatePath => brand(value);
export const jpegTemplatePath = (value: string): JpegTemplatePath => brand(value);
export const svgTemplatePath = (value: string): SvgTemplatePath => brand(value);
export const templatePath = (value: string): TemplatePath => brand(value);

const PDF_EXTENSION = '.pdf';

/** Prefix path passed to pdftocairo (split output path without `.pdf`). */
export const pdftocairoOutputPrefix = (path: PdfPath): string =>
    path.endsWith(PDF_EXTENSION) ? path.slice(0, -PDF_EXTENSION.length) : path;

/** ponytail: pdftocairo -singlefile writes image output beside the extensionless prefix */
export const pngPathFromPdftocairoPrefix = (prefix: string): PngPath => pngPath(prefix);
export const jpegPathFromPdftocairoPrefix = (prefix: string): JpegPath => jpegPath(prefix);
export const svgPathFromPdftocairoPrefix = (prefix: string): SvgPath => svgPath(prefix);

export const pdfTemplatePathForImageSplit = (
    imageTemplate: PngTemplatePath | JpegTemplatePath | SvgTemplatePath,
): PdfTemplatePath => pdfTemplatePath(`${imageTemplate}${PDF_EXTENSION}`);
