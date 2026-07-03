<div align="center">
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
</div>

English | [日本語](README.ja.md)

This extension is designed to make PDF and image files easier to handle in VS Code.
It provides PDF splitting and cropping, conversion between PDF, image, SVG, Mermaid, and editable Draw.io image files, and LaTeX code generation.

## Demo

## Features

### PDF Operations

- **Crop**: Crops the margins of the selected PDF file.
- **Split**: Splits the selected PDF file into single-page PDFs.
- **Merge**: Merges multiple selected PDF files into one.

### Conversion

- **Output-format based conversion**: In the Explorer context menu, choose output formats such as `Convert > PDF`, `Convert > PNG`, `Convert > JPEG`, `Convert > WebP`, `Convert > AVIF`, or `Convert > SVG`.
- **PDF / image / SVG / Mermaid / Draw.io conversion**: Convert supported inputs to the selected output format.
- **Mixed selection**: Convert multiple supported input formats to the same output format in one operation.

### LaTeX Code Generation

- **Insert from PDF**: Drag and drop a PDF file into a LaTeX document to automatically insert the corresponding LaTeX code.
- **Insert from Image**: Paste a clipboard image into a LaTeX document, choose whether to save it as PDF or as an image, edit the output path, and insert the corresponding LaTeX code.

## Installation

You can install this extension in one of the following ways:

- **Visual Studio Code Marketplace**:
  Search for "LaTeX Graphics Helper" in the Extensions Marketplace within VS Code and install it.
  [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)

- **Open VSX Registry**:
  It can also be installed from Open VSX, an alternative marketplace for VS Code.
  [Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## Commands

| Feature                | Input                                                                               | Output                  | Use case                                   | Required external tools  |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ | ------------------------ |
| Crop PDF margins       | `.pdf`                                                                              | `.pdf`                  | Remove margins from figure PDFs            | Ghostscript              |
| Split PDF              | `.pdf`                                                                              | `.pdf`                  | Split a PDF into single pages              | None                     |
| Convert to PDF         | `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`                                           | `.pdf`                  | Convert raster images to PDF               | None                     |
| Convert to PDF         | `.svg`, `.mmd`, `.mermaid`, editable Draw.io images                                 | `.pdf`                  | Convert figure files to PDF                | Depends on input format  |
| Convert to PNG         | `.pdf`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.svg`, Mermaid, editable Draw.io images | `.png`                  | Convert figure files to PNG                | Depends on input format  |
| Convert to JPEG        | `.pdf`, `.png`, `.webp`, `.avif`, `.svg`, Mermaid, editable Draw.io images          | `.jpeg`                 | Convert figure files to JPEG               | Depends on input format  |
| Convert to WebP        | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.avif`, `.svg`, Mermaid, editable Draw.io images  | `.webp`                 | Convert figure files to WebP               | Depends on input format  |
| Convert to AVIF        | `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, Mermaid, editable Draw.io images  | `.avif`                 | Convert figure files to AVIF               | Depends on input format  |
| Convert to SVG         | `.pdf`, `.mmd`, `.mermaid`, editable Draw.io images                                 | `.svg`                  | Convert figure files to SVG                | Depends on input format  |
| Insert PDF into LaTeX  | `.pdf`                                                                              | LaTeX code              | Generate `figure` / `includegraphics` code | None                     |
| Insert clipboard image | Clipboard image                                                                     | Image file + LaTeX code | Paste screenshots into LaTeX               | Depends on output format |

## Required Tools

- **Draw.io**: The Draw.io desktop application is required to convert editable Draw.io images (`.drawio.png`, `.dio.png`, `.drawio.svg`, `.dio.svg`). Download it from [Draw.io](https://github.com/jgraph/drawio-desktop/releases).
- **Ghostscript**: Required for PDF margin detection during PDF cropping.
- **rsvg-convert**: SVG to PDF conversion requires rsvg-convert (from [librsvg](https://wiki.gnome.org/Projects/LibRsvg)). On macOS: `brew install librsvg`. On Debian/Ubuntu: `apt install librsvg2-bin`.
- **Google Chrome / Chromium**: Required when using the Puppeteer backend for SVG conversion and when converting Mermaid files.

## Configuration

Main settings:

| Setting                                                    | Default                        | Description                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `latex-graphics-helper.outputPath.clipboardImage`          | `${fileDirname}/${dateNow}`    | Default output path shown when pasting a clipboard image. It can be edited during paste, and the extension is added automatically |
| `latex-graphics-helper.figure.placementOptions`            | `[H]` etc.                     | Candidate placement options for the `figure` environment                                                                          |
| `latex-graphics-helper.figure.alignmentOptions`            | `\centering` etc.              | Candidate alignment commands inside `figure`                                                                                      |
| `latex-graphics-helper.figure.graphicsOptions`             | `[width=1.0\linewidth]` etc.   | Candidate options for `includegraphics`                                                                                           |
| `latex-graphics-helper.subfigure.verticalAlignmentOptions` | `[t]` etc.                     | Candidate vertical alignment options for `minipage` snippets generated from multiple dropped PDFs                                 |
| `latex-graphics-helper.subfigure.widthOptions`             | `{0.45\linewidth}` etc.        | Candidate width options for `minipage` snippets generated from multiple dropped PDFs                                              |
| `latex-graphics-helper.subfigure.spacingOptions`           | `\hspace{0.01\linewidth}` etc. | Candidate spacing options between figures generated from multiple dropped PDFs                                                    |
| `latex-graphics-helper.execPath.drawio`                    | empty string                   | Path to Draw.io Desktop. If empty, the OS default command is used                                                                 |
| `latex-graphics-helper.execPath.ghostscript`               | empty string                   | Path to Ghostscript. If empty, the OS default command is used                                                                     |
| `latex-graphics-helper.execPath.pdftocairo`                | `pdftocairo`                   | Path to the `pdftocairo` executable                                                                                               |
| `latex-graphics-helper.execPath.rsvgConvert`               | `rsvg-convert`                 | Path to the `rsvg-convert` executable                                                                                             |
| `latex-graphics-helper.convertToPdf.svg.engine`            | `puppeteer`                    | SVG to PDF backend. Choose `puppeteer` or `rsvg-convert`                                                                          |
| `latex-graphics-helper.convertToWebp.effort`               | `4`                            | Encoding effort for WebP output                                                                                                   |
| `latex-graphics-helper.convertToAvif.effort`               | `4`                            | Encoding effort for AVIF output                                                                                                   |

Output paths and LaTeX snippet candidates can also be changed from VS Code settings.

## Output Panel

Open **View → Output → LaTeX Graphics Helper** to see command execution logs, batch progress, and external tool errors.
