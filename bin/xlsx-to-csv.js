#!/usr/bin/env node

const { xlsxToCsv } = require('../dist/accounting/util/csv-util');
const { checkRequiredArgs, abortProgram, xlsxToCsvAll } = require('./common');
const program = require('commander');


program
    .version('1.0.0')
    .option('-i, --input <path>', 'xlsx input file')
    .option('-n, --sheet-name <name>', 'sheet name to export in csv')
    .option('-a, --all-sheet', 'export all sheets in csv')
    .option('-o, --output [path]', 'output filename')
    .option('-od, --output-dir [dir]', 'output directory');


const args = program.parse(process.argv);
const { input: filepath, sheetName, ouput: outputFile, outputDir } = args;

const message = checkRequiredArgs(args, ['input', { oneOf: ['sheetName', 'allSheet'] }, { oneOf: ['output', 'outputDir'] }]);

if (message)
    abortProgram(message);


if (!filepath.endsWith('.xlsx'))
    abortProgram(`${filepath} has not a .xlsx format`);

if (args.allSheet)
    xlsxToCsvAll({ filepath, outputDir });
else
    xlsxToCsv({ filepath, sheetName, outputFile, outputDir }).then(outputFile => console.log(`${outputFile} generated`));
