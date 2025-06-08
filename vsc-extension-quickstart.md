# Welcome to the LaTeX Graphics Helper VS Code Extension

## About this Extension

This VS Code extension provides helpful tools for working with graphics in LaTeX documents. It allows you to easily crop PDF files and convert Draw.io diagrams to PDF format directly within VS Code. It also allows you to insert LaTeX code for PDF files by dragging and dropping them into your editor.

## Features

*   **Crop PDF**: Crop the margins of PDF files.
*   **Convert Draw.io to PDF**: Convert Draw.io files (.drawio or .dio) to PDF, with each tab saved as a separate PDF.
*   **Insert LaTeX for PDF**: Drag and drop PDF files into your LaTeX document to automatically insert the corresponding LaTeX code (`figure` or `minipage` environment).

## Requirements

To use this extension, you need:

*   `pdfcrop` installed on your system (typically included with TeX Live or MiKTeX).
*   The Draw.io desktop application installed on your system for Draw.io to PDF conversion.

## Configuration

You can customize certain aspects of the extension's behavior through VS Code settings, such as specifying the paths to the `pdfcrop` and Draw.io executables or defining custom output paths. Refer to the README for detailed configuration options.

## Usage

Select PDF or Draw.io files in the Explorer view and choose one of the following commands from the right-click context menu:

-   `Crop`: Crops the selected PDF files.
-   `Convert to PDF`: Converts the selected Draw.io files to PDF.

Alternatively, you can drag and drop PDF files directly into your LaTeX editor.
