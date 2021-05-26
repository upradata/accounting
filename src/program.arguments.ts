import program from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { INPUT_DATA_DEFAULTS, ImporterFiles } from './import/importer-input';
import { EditterFormats } from './edition/editter';
import { isDefined, assignRecursive, AssignOptions, keys } from '@upradata/util';
import { red } from '@upradata/node-util';


program
    .version('1.0.0')
    .option('-s, --exercise-start <date>', `Start date of the exercise in DDMMYYYY format`)
    .option('-m, --metadata <path>', 'Metadata of the accounting')
    .option('-o, --output-dir <path>', 'Output directory for the edition')
    .option('-f, --fec [path]', 'Generate fec')
    .option('-F, --fec-only-non-imported', 'Generate fec (only non imported data in accounting software)')
    .option('-e, --edit', 'Edit accounting: Balance Des Comptes, Journal Centraliseur et Grand Livre')
    .option('--edit-type <type>', 'Editter logger types', concat, [])
    .option('--edit-short', 'Edit accounting condensed mode.')
    .option('--edit-grand-livre', 'Edit Grand Livre.')
    .option('--edit-balance', 'Edit Balance Des Comptes.')
    .option('--edit-journal', 'Edit Journal Centraliseur.')
    .option('--edit-pieces', 'Edit Pièces.')
    .option('-d, --data-directory <path>', 'Directory for input data.')
    .option('-o, --input-ods [path]', 'ODS file containing accounting data')
    .option('-l, --input-csv <input-csv-path>', 'comma separated list', commaSeparatedList);


function commaSeparatedList(value: string, dummyPrevious: string[]) {
    return value.split(',').reduce((o, v) => {
        const [ key, filename ] = v.split(':');
        o[ key.trim() ] = { filename: filename.trim() };

        return o;
    }, {});
}

function concat(value: string, previous: string[]) {
    return previous.concat(value);
}

export interface InputArguments<StringOrBoolArg extends string | boolean> {
    exerciseStart: string;
    metadata?: string;
    outputDir: string;
    fec?: string | boolean;
    fecOnlyNonImported?: boolean;
    edit?: boolean;
    editType?: (keyof EditterFormats)[];
    editShort?: boolean;
    editGrandLivre?: boolean;
    editBalance?: boolean;
    editJournal?: boolean;
    editPieces?: boolean;
    dataDirectory?: string;
    inputOds?: StringOrBoolArg;
    inputCsv?: ImporterFiles<{ filename: string; }>;
}

export type ConsoleArguments = InputArguments<string | boolean>;


export class ProgramArguments implements InputArguments<string> {
    exerciseStart: string = undefined;
    metadata?: string = path.join(__dirname, '../metadata.json');
    outputDir = '.';
    fec = true;
    fecOnlyNonImported = false;
    edit = false;
    editType = undefined;
    editShort = false;
    editGrandLivre: boolean = undefined;
    editBalance: boolean = undefined;
    editJournal: boolean = undefined;
    editPieces: boolean = undefined;
    dataDirectory: string = undefined;
    inputOds = INPUT_DATA_DEFAULTS.odsFilename;
    inputCsv?: ImporterFiles<{ filename: string; }> = undefined;


    constructor(consoleArgs: ConsoleArguments) {
        assignRecursive(this, consoleArgs, new AssignOptions({ onlyExistingProp: true, arrayMode: 'replace' }));

        const enableEdit = keys(this).some(k => k.startsWith('edit') && !!this[ k ]);

        if (enableEdit) {
            this.edit = true;

            if (!this.editType)
                this.editType = [ 'console', 'csv' ];
        }

        const editKeys = [ 'editGrandLivre', 'editBalance', 'editJournal', 'editPieces' ];
        const specificEditSpecified = editKeys.some(k => consoleArgs[ k ]);


        // by default, if "edit" is true => all edits are true also (the same for false)
        // but if a specific edit is specified, the rest is false
        // the Object.assign is doing the affectation and thus isDefined is true
        for (const k of editKeys) {
            if (this.edit)
                this[ k ] = isDefined(this[ k ]) ? this[ k ] : specificEditSpecified ? false : true;
            else
                this[ k ] = false;
        }

        if (this.fecOnlyNonImported)
            this.fec = true;
    }
}

export const parseArgs = async (): Promise<ProgramArguments> => {
    program.parse(process.argv);
    const args = new ProgramArguments(program.opts() as ConsoleArguments);

    await fs.ensureDir(args.outputDir);

    return args;
};


program.configureOutput({
    // Visibly override write routines as example!
    writeOut: (str) => console.log(`${str}`),
    writeErr: (str) => console.error(`[ERR] ${str}`),
    // Highlight errors in color.
    outputError: (str, write) => write(red`${str}`)
});
