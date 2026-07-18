import { defineWebviewConfig } from '../../vite.config';

export default defineWebviewConfig({
  appName: 'split_pdf',
  copyPdfWorker: true,
});
