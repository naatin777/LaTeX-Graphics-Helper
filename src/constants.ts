import type { FileType } from './type';

/** Clipboard paste: PNG/JPEG only (must stay in sync with extension pasteMimeTypes). */
export const CLIPBOARD_IMAGE_TYPES = [
    { mime: 'image/png', ext: 'png' },
    { mime: 'image/jpeg', ext: 'jpeg' },
    // { mime: 'image/webp', ext: 'webp' }
] as const satisfies FileType[];
