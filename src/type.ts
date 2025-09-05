type Brand<K, T> = K & { __brand: T }

export type ImageOutputPath = Brand<string, 'ImageOutputPath'>
export type PdfOutputPath = Brand<string, 'PdfOutputPath'>
