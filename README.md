<div align="center">
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
</div>

English | [日本語](README.ja.md)

This is an extension designed to intuitively handle PDF and image files within VS Code.
It provides PDF splitting and cropping, conversion from images/SVG/Mermaid/editable Draw.io images to PDF, Mermaid to SVG conversion, and LaTeX code generation.

## Demo

## Features

### PDF Operations

- **Crop**: Crops the margins of the selected PDF file.
- **Split**: Splits the selected PDF file into single-page PDFs.
- **Merge**: Merges multiple selected PDF files into one.

### Conversion

- **Convert to PDF**: Converts PNG, JPEG, WebP, AVIF, SVG, Mermaid files, and editable Draw.io images to PDF.
- **Convert to SVG**: Converts Mermaid files to SVG.
- **Shared conversion menu**: In the Explorer context menu, choose output formats such as `Convert > PDF` or `Convert > SVG`.

### LaTeX Code Generation

- **Insert from PDF**: Drag and drop a PDF file into a LaTeX document to automatically insert the corresponding LaTeX code.
- **Insert from Image**: Paste an image from the clipboard into LaTeX to automatically insert the LaTeX code and save the image file.

## Installation

You can install this extension in one of the following ways:

- **Visual Studio Code Marketplace**:
  Search for "LaTeX Graphics Helper" in the Extensions Marketplace within VS Code and install it.
  [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)

- **Open VSX Registry**:
  It can also be installed from Open VSX, an alternative marketplace for VS Code.
  [Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## Commands

| Feature                | Input                                                | Output                  | Use case                                   | Required external tools           |
| ---------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------ | --------------------------------- |
| Crop PDF margins       | `.pdf`                                               | `.pdf`                  | Remove margins from figure PDFs            | Ghostscript                       |
| Split PDF              | `.pdf`                                               | `.pdf`                  | Split a PDF into single pages              | None                              |
| Convert to PDF         | `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`            | `.pdf`                  | Convert raster images to PDF               | None                              |
| Convert to PDF         | `.svg`                                               | `.pdf`                  | Convert SVG figures to PDF                 | `rsvg-convert` or Chrome/Chromium |
| Convert to PDF         | `.mmd`, `.mermaid`                                   | `.pdf`                  | Convert Mermaid diagrams to PDF            | Chrome/Chromium                   |
| Convert to PDF         | `.drawio.png`, `.dio.png`, `.drawio.svg`, `.dio.svg` | `.pdf`                  | Convert editable Draw.io images            | Draw.io Desktop                   |
| Convert to SVG         | `.mmd`, `.mermaid`                                   | `.svg`                  | Convert Mermaid diagrams to SVG            | Chrome/Chromium                   |
| Insert PDF into LaTeX  | `.pdf`                                               | LaTeX code              | Generate `figure` / `includegraphics` code | None                              |
| Insert clipboard image | Clipboard image                                      | Image file + LaTeX code | Paste screenshots into LaTeX               | Depends on output format          |

## Required Tools

- **Draw.io**: The Draw.io desktop application is required to convert editable Draw.io images (`.drawio.png`, `.dio.png`, `.drawio.svg`, `.dio.svg`) to PDF. Download it from [Draw.io](https://github.com/jgraph/drawio-desktop/releases).
- **Ghostscript**: Required for PDF margin detection during PDF cropping.
- **rsvg-convert**: SVG to PDF conversion requires rsvg-convert (from [librsvg](https://wiki.gnome.org/Projects/LibRsvg)). On macOS: `brew install librsvg`. On Debian/Ubuntu: `apt install librsvg2-bin`.
- **Google Chrome / Chromium**: Required when using the Puppeteer backend for SVG conversion and when converting Mermaid files.

## Configuration

- **`latex-graphics-helper.pasteClipboardImageAs`**: How clipboard images are pasted into LaTeX. `ask` (default) shows a picker for PDF vs image; `pdf` or `image` skips the picker.
- **`latex-graphics-helper.execPath.drawio`**: Path to Draw.io Desktop. If empty, the OS default command is used.
- **`latex-graphics-helper.execPath.ghostscript`**: Path to Ghostscript. If empty, the OS default command is used.
- **`latex-graphics-helper.execPath.rsvgConvert`**: Path to `rsvg-convert`.
- **`latex-graphics-helper.convertToPdf.svg.engine`**: SVG to PDF backend. Choose `puppeteer` or `rsvg-convert`.
- **Output channel**: Open **View → Output → LaTeX Graphics Helper** to see command execution, batch progress, and errors logged by the extension.
