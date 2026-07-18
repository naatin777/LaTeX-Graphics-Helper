import assert from 'node:assert/strict';

import { isCropConfigureMessage } from '../src/application/crop_pdf_protocol.js';

suite('Crop PDF Webview protocol', () => {
  test('valid apply payloadを受け入れる', () => {
    assert.equal(
      isCropConfigureMessage({
        type: 'apply',
        payload: {
          cropBox: { left: 0, bottom: 0, right: 100, top: 80 },
          target: { type: 'selected', pages: [1, 2] },
        },
      }),
      true,
    );
  });

  test('preview errorと不正なapply payloadを区別する', () => {
    assert.equal(
      isCropConfigureMessage({
        type: 'previewLoadFailed',
        payload: { message: 'failed' },
      }),
      true,
    );
    assert.equal(
      isCropConfigureMessage({
        type: 'apply',
        payload: {
          cropBox: { left: 0, bottom: 0, right: Number.NaN, top: 80 },
          target: { type: 'all' },
        },
      }),
      false,
    );
  });
});
