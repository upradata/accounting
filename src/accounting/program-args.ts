import program from 'commander';
import * as path from 'path';
import { ImporterFiles } from './import/importer';

program
    .version('1.0.0')
    .option('-s, --exercise-start <date>', `Start date of the exercise in DDMMYYYY format`)
    .option('-m, --metadata <path>', 'Metadata of the accounting')
    .option('-f, --fec [path]', 'Generate fec')
    .option('-e, --edit [path]', 'Edit accounting: Balance Des Comptes, Journal Centraliseur et Grand Livre')
    .option('-es, --edit-short', 'Edit accounting condensed mode.')
    .option('-eg, --edit-grandlivre', 'Edit Grand Livre.')
    .option('-eb, --edit-balance', 'Edit Balance Des Comptes.')
    .option('-ej, --edit-journal', 'Edit Journal Centraliseur.')
    .option('-i, --input <path>', 'Directory for input data.')
    .option('-o, --ods [path]', 'ODS file containing accounting data')
    .option('-l, --list-csv <input-csv-path>', 'comma separated list', commaSeparatedList);


function commaSeparatedList(value: string, dummyPrevious: string) {
    return value.split(',').reduce((o, v) => {
        const [ key, filename ] = v.split(':');
        o[ key ] = { filename };

        return o;
    }, {});
}

export interface ProgramArguments {
    exerciseStart: string;
    metadata?: string;
    fec?: string | boolean;
    edit?: string | boolean;
    editShort?: boolean;
    editGrandLivre?: boolean;
    editBalance?: boolean;
    editJournal?: boolean;
    inputDirectory?: string;
    ods?: string | boolean;
    listCsv?: ImporterFiles<{ filename: string }>;
}

export const programArgs: ProgramArguments = program.parse(process.argv) as any;

programArgs.inputDirectory = programArgs.inputDirectory || path.join(__dirname, '../../data');

const ods = programArgs.ods;
programArgs.ods = typeof ods === 'string' ? ods : ods ? 'comptabilite.ods' : undefined;


const editKeys = [ 'editGrandLivre', 'editBalance', 'editJournal' ];

if (programArgs.edit) {

    for (const k of editKeys) {
        if (programArgs[ k ] === undefined)
            programArgs[ k ] = true;
    }
}

if (editKeys.find(k => programArgs[ k ] === true))
    programArgs.edit = true;
