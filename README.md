<div align="center">
  <img alt="Project Icon" src="./assets/icon.png" width=250>
  <h1>LaTeX Graphics Helper</h1>
  <img alt="GitHub License" src="https://img.shields.io/github/license/naatin777/LaTeX-Graphics-Helper">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/naatin777/LaTeX-Graphics-Helper">
  <img alt="Visual Studio Marketplace Downloads" src="https://img.shields.io/visual-studio-marketplace/d/naatin777.latex-graphics-helper">
  <!-- <img alt="Open VSX Downloads" src="https://img.shields.io/open-vsx/dt/naatin777/LaTeX-Graphics-Helper"> -->
</div>

English | [日本語](README.ja.md)

This is an extension designed to intuitively handle PDF and image files within VS Code.
It offers a variety of features, including PDF merging, splitting, and trimming, mutual conversion of image formats, PDF conversion of Draw.io files, and LaTeX code generation using Gemini AI.

## Demo

<table>
  <tr>
    <td><img src="./assets/1.gif"></td>
    <td><img src="./assets/2.gif"></td>
  </tr>
  <tr>
    <td><img src="./assets/3.gif"></td>
    <td><img src="./assets/4.gif"></td>
  </tr>
</table>

## Features

### PDF Operations
*   **Crop**: Crops the margins of the selected PDF file.
*   **Split**: Splits the selected PDF file into single-page PDFs.
*   **Merge**: Merges multiple selected PDF files into one.
*   **Convert to Image**: Converts PDF files to PNG, JPEG, or SVG format.

### Image & Draw.io Operations
*   **Convert to PDF**: Converts PNG, JPEG, or SVG files to PDF format.
*   **Convert Draw.io to PDF**: Converts Draw.io files (.drawio, .dio) to PDF. Each tab is exported as a separate PDF.

### LaTeX Code Generation
*   **Insert from PDF**: Drag and drop a PDF file into a LaTeX document to automatically insert the corresponding LaTeX code.
*   **Insert from Image**: Paste an image from the clipboard into LaTeX to automatically insert the LaTeX code and save the image file.
*   **Gemini AI**: Uses Gemini AI to generate LaTeX code (equations, tables, etc.) from an image on the clipboard.

## Installation

You can install this extension in one of the following ways:

*   **Visual Studio Code Marketplace**:
    Search for "LaTeX Graphics Helper" in the Extensions Marketplace within VS Code and install it.
    [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)

*   **Open VSX Registry**:
    It can also be installed from Open VSX, an alternative marketplace for VS Code.
    [Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## Required Tools

*   **Draw.io**: The Draw.io desktop application is required to convert Draw.io files (.drawio, .dio) to PDF. Download it from [Draw.io](https://github.com/jgraph/drawio-desktop/releases).
*   **pdfcrop**: The PDF cropping feature requires pdfcrop. It is usually included with TeX Live or MiKTeX.
*   **pdftocairo**: The feature to convert PDFs to images requires pdftocairo. It is usually included with Poppler utilities.
*   **Google Chrome**: Google Chrome is required to convert SVG to PDF.
*   **Gemini AI**: A Gemini API key is required to use the Gemini AI feature. Obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
