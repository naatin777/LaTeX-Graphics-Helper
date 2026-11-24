# Change Log

## Unreleased

- Protect existing files from collisions with Draw.io split-conversion intermediates and clean up intermediates after errors.
- Protect existing files from PDF-to-image conversion intermediates and remove intermediates after failures.
- Update runtime and development dependencies, including security fixes for transitive packages.
- Use npm for dependency installation and extension packaging.
- Raise the minimum VS Code version to 1.107.0.

## 0.5.2

- Use Draw.io's native `--crop` option during PDF export to prevent diagrams from being split across multiple A4 pages

## 0.5.1

- Fix pdfcrop path handling on Windows

## 0.5.0

- Support editable Draw.io PNG and SVG files

## 0.4.0

- Delete AI function

## 0.3.0

- Changed from Inkscape to Puppeteer

## 0.2.0

- Add command to split PDF files
- Add command to merge PDF files

## 0.1.0

- Initial release
