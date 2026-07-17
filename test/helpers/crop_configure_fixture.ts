export const cropConfigureFixture = {
  fileName: 'q a.pdf',
  expectedCroppedPageFileName: 'a a-1-crop.pdf',
  complexUnicodeFileName: '　日本語 English 한국어 中文 العربية हिन्दी ไทย עברית Ελληνικά Русский 🌹 ＡＢＣ１２３①.pdf',
  cropBox: {
    left: 55,
    bottom: 12,
    right: 217,
    top: 149,
  },
  fullPageBox: {
    left: 0,
    bottom: 0,
    right: 282,
    top: 216.95999,
  },
};
