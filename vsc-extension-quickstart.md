# Welcome to the LaTeX Graphics Helper VS Code Extension

## About this Extension

This VS Code extension provides helpful tools for working with graphics in LaTeX documents. It allows you to easily crop PDF files and convert Draw.io diagrams to PDF format directly within VS Code. It also allows you to insert LaTeX code for PDF files by dragging and dropping them into your editor.

## Features

*   **Crop PDF**: Crop the margins of PDF files.
*   **Convert Draw.io to PDF**: Convert Draw.io files (.drawio or .dio) to PDF, with each tab saved as a separate PDF.
*   **Convert PDF to Image**: Convert PDF files to PNG, JPEG, or SVG format using `pdftocairo`.
*   **Convert Image to PDF**: Convert PNG, JPEG, or SVG files to PDF format using `inkscape`.
*   **Insert LaTeX for PDF**: Drag and drop PDF files into your LaTeX document to automatically insert the corresponding LaTeX code (`figure` or `minipage` environment).

## Requirements

To use this extension, you need:

*   `pdfcrop` installed on your system (typically included with TeX Live or MiKTeX).
*   `The Draw.io desktop application` installed on your system for Draw.io to PDF conversion.
*   `pdftocairo` installed on your system (typically included with Poppler utilities) for PDF to Image conversion.
*   `Inkscape` installed on your system for Image to PDF conversion.

## Configuration

You can customize certain aspects of the extension's behavior through VS Code settings. Search for `latex-graphics-helper` in your VS Code settings (`settings.json`).

Some key configuration options include:

*   `latex-graphics-helper.shell`: Specifies the shell to use for executing commands.
*   `latex-graphics-helper.pdfcropCommand`: Specifies the path to the `pdfcrop` executable.
*   `latex-graphics-helper.drawioCommand`: Specifies the path to the Draw.io executable.
*   `latex-graphics-helper.pdftocairoCommand`: Specifies the path to the `pdftocairo` executable.
*   `latex-graphics-helper.inkscapeCommand`: Specifies the path to the Inkscape executable.
*   `latex-graphics-helper.pdfcropOutputPath`: Specifies the output file name when cropping a PDF file.
*   `latex-graphics-helper.drawioToPdfOutputPath`: Specifies the output file name when converting a Draw.io file to PDF.
*   `latex-graphics-helper.pdfToPngOutputPath`: Specifies the output file name when converting a PDF file to PNG.
*   `latex-graphics-helper.pngToPdfOutputPath`: Specifies the output file name when converting a PNG file to PDF.

Refer to the README for a complete list of configuration options.

## Usage

Select PDF or Draw.io files in the Explorer view and choose one of the following commands from the right-click context menu:

-   `Crop`: Crops the selected PDF files.
-   `Convert to PDF`: Converts the selected Draw.io files to PDF.
-   Under the "PDF To" submenu:
    - `Convert to PNG`: Converts the selected PDF files to PNG.
    - `Convert to JPEG`: Converts the selected PDF files to JPEG.
    - `Convert to SVG`: Converts the selected PDF files to SVG.
-   Under the "Image To PDF" submenu:
    - `Convert to PDF (PNG)`: Converts the selected PNG files to PDF.
    - `Convert to PDF (JPEG)`: Converts the selected JPEG files to PDF.
    - `Convert to PDF (SVG)`: Converts the selected SVG files to PDF.

Alternatively, you can drag and drop PDF files directly into your LaTeX editor.
