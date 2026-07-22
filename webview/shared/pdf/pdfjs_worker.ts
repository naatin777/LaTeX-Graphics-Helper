// The PDF.js worker runs in a separate JavaScript context and needs the same Map polyfill.
import './install_map_get_or_insert_computed';
// pdfjs-dist does not publish TypeScript declarations for its worker entry.
import 'pdfjs-dist/build/pdf.worker.mjs';
