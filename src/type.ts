type Brand<K, T> = K & { __brand: T }

export type ImageOutputPath = Brand<string, 'ImageOutputPath'>
export type PdfOutputPath = Brand<string, 'PdfOutputPath'>
export type ExecPath = Brand<string, 'ExecPath'>
export type Shell = Brand<string, 'Shell'>
export type PdftocairoOptions = Brand<string[], 'PdftocairoOptions'>

export type FileType = {
    mime: string;
    ext: string;
}

export type FileInfo = {
    type: FileType;
    buffer: Buffer<ArrayBuffer>;
}
