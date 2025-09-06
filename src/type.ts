type Brand<K, T> = K & { __brand: T }

export type ImageOutputPath = Brand<string, 'ImageOutputPath'>
export type PdfOutputPath = Brand<string, 'PdfOutputPath'>
export type ExecPath = Brand<string, 'ExecPath'>
export type Shell = Brand<string, 'Shell'>
