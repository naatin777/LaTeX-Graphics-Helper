# LaTeX Graphics Helper

A VS Code extension for LaTeX users to efficiently process graphic files. It provides features such as PDF cropping, image format conversion, converting Draw.io files to PDF, and generating LaTeX code using Gemini AI.

- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=naatin777.latex-graphics-helper)
- [Open VSX](https://open-vsx.org/extension/naatin777/latex-graphics-helper)

## Features

-   **Crop PDF**: Automatically crops the margins of selected PDF files.
-   **Convert Draw.io to PDF**: Converts selected Draw.io files (.drawio or .dio) to PDF. Each tab is exported as a separate PDF file.
-   **Convert PDF to Image**: Converts selected PDF files to PNG, JPEG, or SVG format using `pdftocairo`.
-   **Convert Image to PDF**: Converts selected PNG, JPEG, or SVG files to PDF format using `inkscape`.
-   **Insert LaTeX for PDF**: Drag and drop PDF files into your LaTeX document to automatically insert the corresponding LaTeX code (`figure` or `minipage` environment).
-   **Generate LaTeX Code with Gemini AI**: Generate LaTeX code (equations, tables, etc.) from images using Gemini AI.
-   **Manage Gemini API Key**: Set and delete your Gemini API key within VS Code.

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

## Configuration

The following configuration options are available. Search for `latex-graphics-helper` in your VS Code settings (`settings.json`).

| Setting Name | Description | Default Value |
|---|---|---|
| `latex-graphics-helper.shell` | Specifies the shell to use for executing commands. If not specified, the default shell for your operating system will be used (Windows: powershell.exe, macOS: /bin/zsh, others: /bin/bash). | `""` |
| `latex-graphics-helper.execPath.pdfcrop` | Path to the `pdfcrop` executable. | `pdfcrop` |
| `latex-graphics-helper.execPath.drawio` | Path to the Draw.io executable. If not specified, the default path for your operating system will be used (Windows: "C:\\Program Files\\draw.io\\draw.io.exe", macOS: /Applications/draw.io.app/Contents/MacOS/draw.io, others: drawio). | `""` |
| `latex-graphics-helper.execPath.pdftocairo` | Path to the `pdftocairo` executable. | `pdftocairo` |
| `latex-graphics-helper.execPath.inkscape` | Path to the Inkscape executable. If not specified, the default path for your operating system will be used (Windows: "C:\\Program Files\\Inkscape\\bin\\inkscape.exe", others: inkscape). | `""` |
| `latex-graphics-helper.outputPath.cropPdf` | Output file name when cropping a PDF file. | `${fileDirname}/${fileBasenameNoExtension}-crop.pdf` |
| `latex-graphics-helper.outputPath.convertDrawioToPdf` | Output file name when converting a Draw.io file to PDF. | `${fileDirname}/${fileBasenameNoExtension}/${tab}.pdf` |
| `latex-graphics-helper.outputPath.convertPdfToPng` | Output file name when converting a PDF file to PNG. Depends on pdftocairo. The file extension is added automatically. | `${fileDirname}/${fileBasenameNoExtension}` |
| `latex-graphics-helper.outputPath.convertPdfToJpeg` | Output file name when converting a PDF file to JPEG. Depends on pdftocairo. The file extension is added automatically. | `${fileDirname}/${fileBasenameNoExtension}` |
| `latex-graphics-helper.outputPath.convertPdfToSvg` | Output file name when converting a PDF file to SVG. Depends on pdftocairo. | `${fileDirname}/${fileBasenameNoExtension}.svg` |
| `latex-graphics-helper.outputPath.convertPngToPdf` | Output file name when converting a PNG file to PDF. Depends on inkscape. | `${fileDirname}/${fileBasenameNoExtension}.pdf` |
| `latex-graphics-helper.outputPath.convertJpegToPdf` | Output file name when converting a JPEG file to PDF. Depends on inkscape. | `${fileDirname}/${fileBasenameNoExtension}.pdf` |
| `latex-graphics-helper.outputPath.convertSvgToPdf` | Output file name when converting a SVG file to PDF. Depends on inkscape. | `${fileDirname}/${fileBasenameNoExtension}.pdf` |
| `latex-graphics-helper.outputPath.clipboardImage` | Output file name when saving clipboard images to a file. The file extension is added automatically. | `${fileDirname}/${dateNow}` |
| `latex-graphics-helper.choice.figurePlacement` | Available placement specifiers for LaTeX figures and tables. | `["[H]", "[h]", "[t]", "[b]", "[p]", "[ht]", "[hb]", "[hp]", "[tb]", "[tp]", "[bp]", "[htb]", "[htp]", "[hbp]", "[tbp]", "[htbp]"]` |
| `latex-graphics-helper.choice.figureAlignment` | Available alignment options for LaTeX figures and tables. | `["\\centering", "\\raggedright", "\\raggedleft"]` |
| `latex-graphics-helper.choice.graphicsOptions` | Default graphics options for LaTeX figures and tables. | `["[width=1.0\\linewidth]", "[width=0.9\\linewidth]", "[width=0.8\\linewidth]", "[width=0.7\\linewidth]", "[width=0.6\\linewidth]", "[width=0.5\\linewidth]"]` |
| `latex-graphics-helper.choice.subVerticalAlignment` | Available vertical alignment options for LaTeX minipage environments. | `["[t]", "[c]", "[b]"]` |
| `latex-graphics-helper.choice.subWidth` | Available width options for LaTeX minipage environments. | `["{0.45\\linewidth}", "{0.35\\linewidth}", "{0.25\\linewidth}", "{0.15\\linewidth}"]` |
| `latex-graphics-helper.choice.spaceBetweenSubs` | Available spacing options between subfigures/subtables in LaTeX minipage environments. | `["\\hspace{0.01\\linewidth}", "\\hspace{0.02\\linewidth}", "\\hspace{0.03\\linewidth}", "\\hspace{0.04\\linewidth}", "\\hspace{0.05\\linewidth}"]` |
| `latex-graphics-helper.pdftocairo.pngOptions` | Options passed to `pdftocairo` when converting PDF to PNG. | `["-png", "-transp", "-singlefile"]` |
| `latex-graphics-helper.pdftocairo.jpegOptions` | Options passed to `pdftocairo` when converting PDF to JPEG. | `["-jpeg", "-singlefile"]` |
| `latex-graphics-helper.pdftocairo.svgOptions` | Options passed to `pdftocairo` when converting PDF to SVG. | `["-svg"]` |
| `latex-graphics-helper.gemini.model` | Selects the Gemini AI model to be used for generating LaTeX code from images. | `gemini-2.0-flash` |
| `latex-graphics-helper.gemini.requests` | List of predefined requests for the Gemini AI model to generate LaTeX code from images. | `["Convert the uploaded file into a LaTeX equation and output it, enclosed in an align environment. Please avoid Markdown format and do not enclose the output in ```latex```. The output is intended for LaTeX.", "Convert the uploaded file into a LaTeX table and output it, enclosed in a table environment. Please avoid Markdown format and do not enclose the output in ```latex```. The output is intended for LaTeX."]` |

## Requirements

-   To use the PDF cropping feature, `pdfcrop` must be installed on your system. It is typically included with TeX Live or MiKTeX.
-   To use the Draw.io to PDF conversion feature, the Draw.io desktop application must be installed on your system.
-   To use the PDF to Image conversion features, `pdftocairo` must be installed on your system. It is typically included with Poppler utilities.
-   To use the Image to PDF conversion features, Inkscape must be installed on your system.
-   To use the Gemini AI features, you need a Gemini API key. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

## License

MIT License
