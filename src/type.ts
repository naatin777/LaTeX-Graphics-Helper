type Brand<K, T> = K & { __brand: T }

export type FileType = {
    mime: string;
    ext: string;
}

export type FileInfo = {
    type: FileType;
    buffer: Buffer<ArrayBuffer>;
}

export type LogLevel = 'info' | 'warn' | 'error'

export type ExecutablePath = Brand<string, 'ExecutablePath'>

export type DrawioPath = Brand<string, 'DrawioPath'>

export type PdfPath = Brand<string, 'PdfPath'>
export type PdfTemplatePath = Brand<string, 'PdfTemplatePath'>

export type PngPath = Brand<string, 'PngPath'>
export type PngTemplatePath = Brand<string, 'PngTemplatePath'>

export type JpegPath = Brand<string, 'JpegPath'>
export type JpegTemplatePath = Brand<string, 'JpegTemplatePath'>

export type SvgPath = Brand<string, 'SvgPath'>
export type SvgTemplatePath = Brand<string, 'SvgTemplatePath'>

export type BitmapPath = PngPath | JpegPath
export type BitmapTemplatePath = PngTemplatePath | JpegTemplatePath

export type BitmapType = 'png' | 'jpeg'

export type Path = PdfPath | PngPath | JpegPath | SvgPath
export type TemplatePath = Path | PdfTemplatePath | PngTemplatePath | JpegTemplatePath | SvgTemplatePath
