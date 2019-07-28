#!/usr/bin/env node

const { odsToXlsx, xlsxToCsv } = require('../dist/accounting/util/csv-util');
const { checkRequiredArgs, abortProgram, xlsxToCsvAll } = require('./common');

const { tmpdir } = require('os');
const { mkdtemp, readdir } = require('fs');
const { promisify } = require('util');
const path = require('path');

const tmpDir = tmpdir();
const makeTmpDir = promisify(mkdtemp);
const readdirAsync = promisify(readdir);

const program = require('commander');


program
    .version('1.0.0')
    .option('-i, --input <path>', 'xlsx input file')
    .option('-n, --sheet-name <name>', 'sheet name to export in csv')
    .option('-o, --output [path]', 'output filename')
    .option('-od, --output-dir [dir]', 'output directory')
    .option('-a, --all-sheet', 'export all sheets in csv');


const args = program.parse(process.argv);
const { input: filepath, sheetName, ouput: outputFile, outputDir } = args;

const message = checkRequiredArgs(args, ['input', { oneOf: ['sheetName', 'allSheet'] }, { oneOf: ['output', 'outputDir'] }]);

if (message)
    abortProgram(message);

if (!filepath.endsWith('.ods'))
    abortProgram(`${filepath} has not a .ods format`);


function getTmpdir() {
    return makeTmpDir(`${tmpDir}${path.sep}`).catch(e => {
        throw new Error(`An error occured while creating a tmp directory in ${`${tmpDir}${path.sep}`}: ${e}`);
    });
}

async function run() {
    const tmpDirectory = await getTmpdir();

    const xlsFile = await odsToXlsx({ filepath, outputDir: tmpDirectory });

    if (args.allSheet)
        await xlsxToCsvAll({ filepath: xlsFile, outputDir });
    else
        xlsxToCsv({ filepath: xlsFile, sheetName, outputFile, outputDir }).then(outputFile => console.log(`${outputFile} generated`));
}

run();
