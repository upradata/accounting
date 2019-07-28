#!/usr/bin/env node

const { odsToXlsx } = require('../dist/accounting/util/csv-util');
const { checkRequiredArgs, abortProgram } = require('./common');

const program = require('commander');

program
    .version('1.0.0')
    .option('-i, --input <path>', 'ods input file')
    .option('-o, --output [dir]', 'output directory');


const args = program.parse(process.argv);
const { input: filepath, ouput: outputDir } = args;

const message = checkRequiredArgs(args, ['input']);

if (message)
    abortProgram(message);


if (!filepath.endsWith('.ods'))
    abortProgram(`${filepath} has not a .ods format`);


odsToXlsx({ filepath, outputDir }).then(outputFile => console.log(`${outputFile} generated`));
