const fs = require('fs');
// const path = require('path');
const urldecode = require('urldecode')

const inputFile = process.argv[2];
const ouputFile = process.argv[3] || inputFile.replace(/pdf$/, 'json');


const _ = require('lodash');

/* const DISTANCE_DELTA = 0.1;
PDFFont.areAdjacentBlocks = function (t1, t2) {
    let isInSameLine = Math.abs(t1.y - t2.y) <= DISTANCE_DELTA;
    let isDistanceSmallerThanASpace = ((t2.x - t1.x - t1.w) < cls.getSpaceThreshHold(t1));

    return isInSameLine && isDistanceSmallerThanASpace;
}; */

// const pdfParser = new PDFParser();
// const pdfParser = new PDFParser(null, true);

// modified from pdf2json/lib/pdf.js
const concatText = textObjs => {
    let concat = '';
    let prevText = null;

    for (const { y, R } of textObjs) {
        concat += R.T;

        if (prevText && Math.abs(y - prevText.y) > 9) // new line
            concat += '\r\n';
    }

    return concat;
};

const getRawTextContent2 = function () {
    let retVal = "";
    if (!this.needRawText)
        return retVal;

    _.each(this.rawTextContents, function (textContent, index) {
        let prevText = null;
        _.each(textContent.bidiTexts, function (textObj, idx) {
            // if (textObj.constructor.name === 'BidiResult')
            console.log(textObj)
            if (!textObj.R)
                return;
            if (prevText) {
                if (Math.abs(textObj.y - prevText.y) <= 9) { // not a new line
                    if (PDFFont.areAdjacentBlocks(prevText, textObj))
                        prevText.str += "" + textObj.str;
                    else
                        prevText.str += " " + textObj.str;
                    // console.log(textObj)
                }
                else {
                    retVal += prevText.str + "\r\n";
                    prevText = textObj;
                    //  console.log(textObj)

                }
            }
            else {
                prevText = textObj;
                // console.log(textObj)
            }

        });
        if (prevText) {
            retVal += prevText.str;
        }
        retVal += "\r\n----------------Page (" + index + ") Break----------------\r\n";
    });

    return retVal;


    /*   if (PDFFont.areAdjacentBlocks(prevText, text) && PDFFont.haveSameStyle(prevText, text)) {
          let preT = decodeURIComponent(prevText.R[0].T);
          let curT = decodeURIComponent(text.R[0].T);
  
          prevText.R[0].T += text.R[0].T;
          prevText.w += text.w;
          text.merged = true;
  
          let mergedText = decodeURIComponent(prevText.R[0].T);
  
      }
      else {
          prevText = text;
      } */
}

// pdfParser.PDFJS.getRawTextContent = getRawTextContent;

/* 
pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
    // fs.writeFileSync(ouputFile, urldecode(JSON.stringify(pdfData)), { encoding: 'utf8' });
    fs.writeFileSync(ouputFile + '.txt', pdfParser.getRawTextContent(), { encoding: 'utf8' });
});
 
pdfParser.loadPDF(inputFile);
 */

const stream = require('stream');

const PDFFont = require('./pdffont');
const PdfCanvas = require('pdf2json/lib/pdfcanvas');
const PDFUnit = require('pdf2json/lib/pdfunit');


PdfCanvas.prototype.setFont = function (fontObj) {
    if ((!!this.currentFont) && _.isFunction(this.currentFont.clean)) {
        this.currentFont.clean();
        this.currentFont = null;
    }

    this.currentFont = new PDFFont(fontObj);
};
const PDFParser = require('pdf2json');
const pdfParser = new PDFParser();
/* 
function StringifyStream() {
    stream.Transform.call(this);
 
    this._readableState.objectMode = false;
    this._writableState.objectMode = true;
}
require('util').inherits(StringifyStream, stream.Transform);
 
StringifyStream.prototype._transform = function (obj, encoding, callback) {
    this.push(JSON.stringify(obj));
    callback();
};
 */
class StringifyStream extends stream.Transform {
    constructor() {
        super({ objectMode: true });
    }

    _transform(obj, encoding, callback) {
        this.push(JSON.stringify(obj));
        callback();
    }
}

/* const _createContentStream = function (jsonObj) {
    const rStream = new stream.Readable({ objectMode: true });
    rStream.push(jsonObj);
    rStream.push(null);
 
    return rStream;
}; */

class ObjectStream extends stream.Readable {
    constructor(pdf) {
        super({ objectMode: true });
        this.pdf = pdf;
    }

    _read() {
        this.push(this.pdf);
        this.push(null);
    }
}

const _createOutputStream = function (outputPath, callback) {
    let outputStream = fs.createWriteStream(outputPath);
    outputStream.on('finish', () => {
        callback(null, outputPath);
    });
    outputStream.on('error', err => {
        callback({ "streamError": err }, outputPath);
    });

    return outputStream;
};



getMergedTextBlocksStream = function () {
    // return new ObjectStream(pdfParser.PDFJS.getMergedTextBlocksIfNeeded());
    return new ObjectStream(getMergedTextBlocks.call(pdfParser.PDFJS));
};


const getText = textObj => textObj.R[0].T;
const setText = (textObj, text) => textObj.R[0].T = text;

getMergedTextBlocks = function () {
    for (const page of this.pages) {
        let prevText = null;

        page.Texts.sort(PDFFont.compareBlockPos);
        page.Texts = page.Texts.filter((t, j) => {
            let isDup = (j > 0) && PDFFont.areDuplicateBlocks(page.Texts[j - 1], t);
            if (isDup) {
                nodeUtil.p2jinfo("skipped: dup text block: " + decodeURIComponent(getText(t)));
            }
            return !isDup;
        });

        for (const text of page.Texts) {

            let curT = decodeURIComponent(getText(text));
            setText(text, curT);

            if (prevText) {


                if (areAdjacentBlocks(prevText, text) && PDFFont.haveSameStyle(prevText, text)) {
                    // areAdjacentBlocks(prevText, text) && PDFFont.haveSameStyle(prevText, text);

                    let preT = decodeURIComponent(prevText.R[0].T);

                    setText(prevText, getText(prevText) + getText(text));
                    prevText.w += text.w;
                    text.merged = true;

                    let mergedText = decodeURIComponent(getText(prevText));
                    console.log(`merged text block: ${preT} + ${curT} => ${mergedText}`);
                    // prevText = null; //yeah, only merge two blocks for now
                }
                else {
                    prevText = text;
                }
            }
            else {
                prevText = text;
            }
        }

        page.Texts = page.Texts.filter(t => !t.merged);
    }

    return { Pages: this.pages, Width: this.pageWidth };
};

function textWidth(t) {
    const text = getText(t);
    const { toUnicode, widths } = t.font;

    const index = toUnicode.indexOf('M');
    let i = index;
    while (i > 0) {
        if (widths[i] > 0)
            break;

        --i;
    }

    const emUnits = widths[i];

    let size = 0;
    for (const letter of text) {
        size += t.pdfFont.charWidthInPixel(letter, t.fontSize);
        continue;
        // const code = letter.codePointAt(0);
        const index = toUnicode.indexOf(letter);
        console.assert(index !== -1, `No Unicode Code for ${letter} in ${text}`);

        let i = index;
        while (i > 0) {
            if (widths[i] > 0)
                break;

            --i;
        }

        size += widths[i]; // / emUnits * PDFFont.getFontSize(t) * 96 / 72;/* PDFUnit._pixelPerPoint */; // PDFFont.getFontSize(t) / 12;// PDFUnit.toFormX (widths[i] || 0) / PDFFont.getFontSize(t) / 8;
    }

    return size;// { size, scale: 1 / emUnits * PDFFont.getFontSize(t) * 96 / 72 }; // / 32 * PDFFont.getFontSize(t) / 12 // / 32;
    // return size / PDFFont.getFontSize(t);
}

areAdjacentBlocks = function (t1, t2) {
    const DISTANCE_DELTA = 0.1;
    const isInSameLine = Math.abs(t1.y - t2.y) <= DISTANCE_DELTA;
    // let isDistanceSmallerThanASpace = ((t2.x - t1.x - t1.w) < cls.getSpaceThreshHold(t1));
    const whitespaceSize = (PDFFont.getFontSize(t1) / 12) * t1.sw;
    const wordSize = textWidth(t1); //  whitespaceSize * getText(t1).length;

    const isDistanceSmallerThanASpace = ((t2.px - t1.px) * 1.4  /* * scale */ - wordSize) < t1.spaceWidthPixels;// t1.sw; // * 4;// whitespaceSize;

    if (isDistanceSmallerThanASpace && isInSameLine) {
        console.log({
            whitespaceSize, wordSize,
            width: t1.w,
            t1: { length: getText(t1).length, x: t1.x, y: t1.y, text: getText(t1) },
            t2: { length: getText(t2).length, x: t2.x, y: t2.y, text: getText(t2) },
            diffX: t2.x - t1.x, wordSize, diffX0: t2.x - t1.x - wordSize, diffY: t2.y - t1.y
        });
    }

    return isInSameLine && isDistanceSmallerThanASpace;
};

const generateMergedTextBlocksStream = function (callback) {
    let outputStream = _createOutputStream('pdftotext.txt', callback);
    getMergedTextBlocksStream().pipe(new DecodeURriTextes()).pipe(new ConcatStream()).pipe(outputStream); // StringifyStream
};



pdfParser.on('pdfParser_dataError', errData => console.error(errData.parserError));
pdfParser.on('pdfParser_dataReady', pdfData => {
    // fs.writeFileSync(ouputFile, urldecode(JSON.stringify(pdfData)), { encoding: 'utf8' });
    // fs.writeFileSync(ouputFile + '.txt', pdfParser.getRawTextContent(), { encoding: 'utf8' });
    generateMergedTextBlocksStream((err, outputPath) => {
        if (err)
            console.error(err);
        console.log(`Done: ${outputPath}`);
    });
});


class DecodeURriTextes extends stream.Transform {
    constructor() {
        super({ objectMode: true });
    }

    _transform(obj, encoding, callback) {
        const pdf = obj;

        for (const page of pdf.Pages) {

            for (const text of page.Texts) {
                text.R[0].T = decodeURIComponent(text.R[0].T);
            }
        }

        this.push(pdf);
        callback();
    }
}

const separator = ';';
filterLine = line =>
    /^\s*\d{2}\/\d{2}\/\d{4}/.test(line);
class ConcatStream extends stream.Transform {
    constructor() {
        super({ objectMode: true });
    }

    _transform(obj, encoding, callback) {
        const pdf = obj;

        let concat = '';
        let row = '';
        let prevText = null;

        const textObjs = pdf.Pages.map(page => page.Texts).reduce((allTextes, textes) => { allTextes.push(...textes); return allTextes; }, []);

        for (const textObj of textObjs) {
            if (prevText && Math.abs(textObj.y - prevText.y) > 0.01) { // new line
                if (filterLine(row))
                    concat += row + '\n'; // '\r\n';
                row = '';
            } else {
                if (row)
                    row += separator;
            }

            row += getText(textObj);
            prevText = textObj;
        }

        if (!row)
            concat += row;


        this.push(concat);
        callback();
    }
}


const verbosity = 0;// 5;
pdfParser.loadPDF(inputFile, verbosity);
