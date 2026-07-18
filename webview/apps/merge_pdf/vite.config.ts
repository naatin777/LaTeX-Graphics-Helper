import { defineWebviewConfig } from '../../vite.config';

export default defineWebviewConfig({
  appName: 'merge_pdf',
  copyPdfWorker: true,
});
