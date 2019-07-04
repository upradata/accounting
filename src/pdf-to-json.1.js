const fs = require('fs');
const PDFParser = require('pdf2json');
// const path = require('path');
const urldecode = require('urldecode')
const pdfjs = require('./pdf.js/build/generic/build/pdf');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const inputFile = './test.pdf'; // process.argv[2];
const ouputFile = process.argv[3] || inputFile.replace(/pdf$/, 'json');

const content = `<canvas id="the-canvas"></canvas>`;
const dom = new JSDOM(content);
const document = dom.window.document;


/* async function run() {
    const pdf = await pdfjs.getDocument(inputFile);
}

run(); */

async function run() {
    const pdf = await pdfjs.getDocument(inputFile).promise;

    console.log('Pdf loaded');

    const pageNumber = 1;
    const page = await pdf.getPage(pageNumber);

    console.log('Page loaded');

    const scale = 1; // 1.5;
    const viewport = page.getViewport({ scale: scale });

    // Prepare canvas using PDF page dimensions
    const canvas = document.getElementById('the-canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
        canvasContext: context,
        viewport: viewport,
        // intent: 'print',
        canvasFactory: new DOMCanvasFactory(),
    };
    page.render(renderContext).promise;
    console.log('Page rendered');

    console.log(canvas.outerHTML);
}


class DOMCanvasFactory {
    create(width, height) {
        if (width <= 0 || height <= 0) {
            throw new Error('Invalid canvas size');
        }
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        return {
            canvas,
            context,
        };
    }

    reset(canvasAndContext, width, height) {
        if (!canvasAndContext.canvas) {
            throw new Error('Canvas is not specified');
        }
        if (width <= 0 || height <= 0) {
            throw new Error('Invalid canvas size');
        }
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext) {
        if (!canvasAndContext.canvas) {
            throw new Error('Canvas is not specified');
        }
        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}


run();
