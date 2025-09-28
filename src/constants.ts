import { FileType } from './type';
import { PdftocairoOptions } from './type';

export const PDFTOCAIRO_PNG_OPTIONS = ['-png', '-transp', '-singlefile'] as PdftocairoOptions;
export const PDFTOCAIRO_JPEG_OPTIONS = ['-jpeg', '-singlefile'] as PdftocairoOptions;
export const PDFTOCAIRO_SVG_OPTIONS = ['-svg'] as PdftocairoOptions;

export const CLIPBOARD_IMAGE_TYPES = [
    { mime: 'image/png', ext: 'png' },
    { mime: 'image/jpeg', ext: 'jpeg' },
    { mime: 'image/webp', ext: 'webp' }
] as const satisfies FileType[];
