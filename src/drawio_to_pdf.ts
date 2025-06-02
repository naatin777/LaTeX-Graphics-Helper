import { getDrawioCommand, getDrawioToPdfOutputPath, getPdfcropCommand, getShell } from './configuration';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { PDFDocument } from 'pdf-lib';
import { Parser } from 'xml2js';

async function getDrawioTabNames(inputPath: string): Promise<string[]> {
    const xmlData = fs.readFileSync(inputPath, 'utf-8');
    const parser = new Parser();
    const result = await parser.parseStringPromise(xmlData);
    const diagrams = result.mxfile.diagram;
    return diagrams.map((diagram: any) => diagram.$.name);
}

async function savePdfFile(pdfDocument: PDFDocument, outputPath: string, i: number) {
    const newPdfDocument = await PDFDocument.create();
    const [copiedPdfPage] = await newPdfDocument.copyPages(pdfDocument, [i]);
    newPdfDocument.addPage(copiedPdfPage);

    const outputFolderPath = path.dirname(outputPath);

    if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
    }

    const newPdfBytes = await newPdfDocument.save();
    fs.writeFileSync(path.normalize(outputPath), newPdfBytes);
}

export async function drawioToPdf(
    inputPath: string,
    outputPath: string = getDrawioToPdfOutputPath(),
    workspaceFolder: string = '',
): Promise<void> {
    if (!fs.existsSync(inputPath)) {
        vscode.window.showErrorMessage(`File does not exist: ${inputPath}`);
        return;
    }
    const fileName = path.basename(inputPath, path.extname(inputPath));
    const folderName = path.dirname(inputPath);
    const temporaryPdfPath = `${path.join(folderName, fileName)}.pdf`;

    try {
        execSync(
            `${getDrawioCommand()} -xf pdf -t -a -o "${path.normalize(temporaryPdfPath)}" "${path.normalize(inputPath)}"`,
            {
                'cwd': folderName,
                'shell': getShell()
            }
        );
        execSync(
            `${getPdfcropCommand()} "${path.normalize(temporaryPdfPath)}" "${path.normalize(temporaryPdfPath)}"`,
            {
                'cwd': folderName,
                'shell': getShell()
            }
        );

        const drawioTabNames = await getDrawioTabNames(inputPath);

        const pdfBuffer = fs.readFileSync(temporaryPdfPath);
        const pdfDocument = await PDFDocument.load(pdfBuffer);
        const pdfPages = pdfDocument.getPages();
        for (let i = 0; i < pdfPages.length; i++) {
            const tabName = drawioTabNames[i];

            const replacedOutputPath = outputPath
                .replace(/\${fileName}/g, fileName)
                .replace(/\${folderName}/g, folderName)
                .replace(/\${tabName}/g, tabName)
                .replace(/\${workspaceFolder}/g, workspaceFolder);

            savePdfFile(pdfDocument, replacedOutputPath, i);
        }

        fs.unlinkSync(temporaryPdfPath);
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Failed to parse Drawio XML: ${inputPath} - ${error.message}`);
        }

        return;
    }
}
