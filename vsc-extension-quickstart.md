# Welcome to the LaTeX Graphics Helper VS Code Extension

## About this Extension

A VS Code extension for LaTeX users to efficiently process graphic files. It provides features such as PDF cropping, image format conversion, converting Draw.io files to PDF, and generating LaTeX code using Gemini AI.

## Features

*   **Crop PDF**: Crop the margins of PDF files.
*   **Convert Draw.io to PDF**: Convert Draw.io files (.drawio or .dio) to PDF, with each tab saved as a separate PDF.
*   **Convert PDF to Image**: Convert PDF files to PNG, JPEG, or SVG format using `pdftocairo`.
*   **Convert Image to PDF**: Convert PNG, JPEG, or SVG files to PDF format using `inkscape`.
*   **Insert LaTeX for PDF**: Drag and drop PDF files into your LaTeX document to automatically insert the corresponding LaTeX code (`figure` or `minipage` environment).
*   **Generate LaTeX Code with Gemini AI**: Generate LaTeX code (equations, tables, etc.) from images using Gemini AI.
*   **Manage Gemini API Key**: Set and delete your Gemini API key within VS Code.

## Requirements

To use this extension, you need:

*   `pdfcrop` installed on your system (typically included with TeX Live or MiKTeX).
*   `The Draw.io desktop application` installed on your system for Draw.io to PDF conversion.
*   `pdftocairo` installed on your system (typically included with Poppler utilities) for PDF to Image conversion.
*   `Inkscape` installed on your system for Image to PDF conversion.
*   A Gemini API key for generating LaTeX code with Gemini AI. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Configuration

You can customize certain aspects of the extension's behavior through VS Code settings. Search for `latex-graphics-helper` in your VS Code settings (`settings.json`).

Some key configuration options include:

*   `latex-graphics-helper.shell`: Specifies the shell to use for executing commands.
*   `latex-graphics-helper.execPath.pdfcrop`: Specifies the path to the `pdfcrop` executable.
*   `latex-graphics-helper.execPath.drawio`: Specifies the path to the Draw.io executable.
*   `latex-graphics-helper.execPath.pdftocairo`: Specifies the path to the `pdftocairo` executable.
*   `latex-graphics-helper.execPath.inkscape`: Specifies the path to the Inkscape executable.
*   `latex-graphics-helper.outputPath.cropPdf`: Specifies the output file name when cropping a PDF file.
*   `latex-graphics-helper.outputPath.convertDrawioToPdf`: Specifies the output file name when converting a Draw.io file to PDF.
*   `latex-graphics-helper.outputPath.convertPdfToPng`: Specifies the output file name when converting a PDF file to PNG. Depends on pdftocairo. The file extension is added automatically.
*   `latex-graphics-helper.outputPath.convertPdfToJpeg`: Specifies the output file name when converting a PDF file to JPEG. Depends on pdftocairo. The file extension is added automatically.
*   `latex-graphics-helper.outputPath.convertPdfToSvg`: Specifies the output file name when converting a PDF file to SVG. Depends on pdftocairo.
*   `latex-graphics-helper.outputPath.convertPngToPdf`: Specifies the output file name when converting a PNG file to PDF. Depends on inkscape.
*   `latex-graphics-helper.outputPath.convertJpegToPdf`: Specifies the output file name when converting a JPEG file to PDF. Depends on inkscape.
*   `latex-graphics-helper.outputPath.convertSvgToPdf`: Specifies the output file name when converting a SVG file to PDF. Depends on inkscape.
*   `latex-graphics-helper.outputPath.clipboardImage`: Specifies the output file name when saving clipboard images to a file. The file extension is added automatically.
*   `latex-graphics-helper.gemini.model`: Selects the Gemini AI model to be used for generating LaTeX code from images.
*   `latex-graphics-helper.gemini.requests`: List of predefined requests for the Gemini AI model to generate LaTeX code from images.


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

To generate LaTeX code using Gemini AI, right-click on an image file in the Explorer view and select "Generate LaTeX Code with Gemini AI". You will be prompted to select a predefined request or enter a custom one.
