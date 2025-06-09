# LaTeX Graphics Helper

This VS Code extension helps you process graphic files for use in LaTeX documents.

## Features

-   **Crop PDF**: Automatically crops the margins of selected PDF files.
-   **Convert Draw.io to PDF**: Converts selected Draw.io files (.drawio or .dio) to PDF. Each tab is exported as a separate PDF file.
-   **Convert PDF to Image**: Converts selected PDF files to PNG, JPEG, or SVG format using `pdftocairo`.
-   **Insert LaTeX for PDF**: Drag and drop PDF files into your LaTeX document to automatically insert the corresponding LaTeX code (`figure` or `minipage` environment).

## Usage

Select PDF or Draw.io files in the Explorer view and choose one of the following commands from the right-click context menu:

-   `Crop`: Crops the selected PDF files.
-   `Convert to PDF`: Converts the selected Draw.io files to PDF.
-   Under the "PDF To" submenu:
    - `Convert to PNG`: Converts the selected PDF files to PNG.
    - `Convert to JPEG`: Converts the selected PDF files to JPEG.
    - `Convert to SVG`: Converts the selected PDF files to SVG.

Alternatively, you can drag and drop PDF files directly into your LaTeX editor.

## Configuration

The following configuration options are available. Search for `latex-graphics-helper` in your VS Code settings (`settings.json`).

-   `latex-graphics-helper.shell`: Specifies the shell to use for executing commands. If not specified, the default shell for your operating system will be used (Windows: powershell.exe, macOS: /bin/zsh, others: /bin/bash).
-   `latex-graphics-helper.pdfcropCommand`: Specifies the path to the `pdfcrop` executable. Defaults to `pdfcrop`.
-   `latex-graphics-helper.pdfcropOutputPath`: Specifies the output file name when cropping a PDF file. Variables `${folderName}`, `${fileName}`, and `${workspaceFolder}` can be used. Defaults to `${folderName}/${fileName}-crop.pdf`.
-   `latex-graphics-helper.drawioCommand`: Specifies the path to the Draw.io executable. If not specified, the default path for your operating system will be used (Windows: "C:\\Program Files\\draw.io\\draw.io.exe", macOS: /Applications/draw.io.app/Contents/MacOS/draw.io, others: drawio).
-   `latex-graphics-helper.drawioToPdfOutputPath`: Specifies the output file name when converting a Draw.io file to PDF. Variables `${folderName}`, `${fileName}`, `${tabName}`, and `${workspaceFolder}` can be used. Defaults to `${folderName}/${fileName}/${tabName}.pdf`.
-   `latex-graphics-helper.pdftocairoCommand`: Specifies the path to the `pdftocairo` executable. Defaults to `pdftocairo`.
-   `latex-graphics-helper.pdfToPngOutputPath`: Specifies the output file name when converting a PDF file to PNG. Variables `${folderName}`, `${fileName}`, and `${workspaceFolder}` can be used. Defaults to `${folderName}/${fileName}`. The file extension is added automatically.
-   `latex-graphics-helper.pdfToJpegOutputPath`: Specifies the output file name when converting a PDF file to JPEG. Variables `${folderName}`, `${fileName}`, and `${workspaceFolder}` can be used. Defaults to `${folderName}/${fileName}`. The file extension is added automatically.
-   `latex-graphics-helper.pdfToSvgOutputPath`: Specifies the output file name when converting a PDF file to SVG. Variables `${folderName}`, `${fileName}`, and `${workspaceFolder}` can be used. Defaults to `${folderName}/${fileName}.svg`.
-   `latex-graphics-helper.pdfToPngOptions`: Options passed to `pdftocairo` when converting PDF to PNG. Defaults to `["-png", "-singlefile", "-transp"]`.
-   `latex-graphics-helper.pdfToJpegOptions`: Options passed to `pdftocairo` when converting PDF to JPEG. Defaults to `["-jpeg", "-singlefile"]`.
-   `latex-graphics-helper.pdfToSvgOptions`: Options passed to `pdftocairo` when converting PDF to SVG. Defaults to `["-svg"]`.
-   `latex-graphics-helper.graphicsOptions.default`: Default graphics options for LaTeX figures and tables.
-   `latex-graphics-helper.placementSpecifiers.useDefault`: Whether to use the default placement specifiers for LaTeX figures and tables.
-   `latex-graphics-helper.placementSpecifiers.default`: Default placement specifiers for LaTeX figures and tables (e.g., `[H]`).
-   `latex-graphics-helper.placementSpecifiers.choice`: Available placement specifiers for LaTeX figures and tables.
-   `latex-graphics-helper.minipageOptions.useDefault`: Whether to use the default options for LaTeX minipage environments.
-   `latex-graphics-helper.minipageOptions.default`: Default options for LaTeX minipage environments (e.g., `[b]`).
-   `latex-graphics-helper.minipageOptions.choice`: Available options for LaTeX minipage environments.

## Requirements

-   To use the PDF cropping feature, `pdfcrop` must be installed on your system. It is typically included with TeX Live or MiKTeX.
-   To use the Draw.io to PDF conversion feature, the Draw.io desktop application and `pdfcrop` must be installed on your system.
-   To use the PDF to Image conversion features, `pdftocairo` must be installed on your system. It is typically included with Poppler utilities.

## License

MIT License
