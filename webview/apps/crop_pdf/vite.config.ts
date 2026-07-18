import { defineWebviewConfig } from '../../vite.config';

export default defineWebviewConfig({
  appName: 'crop_pdf',
  copyPdfWorker: true,
});
