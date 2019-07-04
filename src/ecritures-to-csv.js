const fs = require('fs');
const PDFParser = require('pdf2json');
const path = require('path');
const urldecode = require('urldecode')

const inputFile = path.join(__dirname, './test.pdf');
const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
    onPdfParseDone(JSON.parse(urldecode(JSON.stringify(pdfData))));
});

pdfParser.loadPDF(inputFile);


function onPdfParseDone(json) {
    json.Pages
}
