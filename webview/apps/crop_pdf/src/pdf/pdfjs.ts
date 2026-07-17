import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = 'pdf.worker.mjs';

export { pdfjs };
