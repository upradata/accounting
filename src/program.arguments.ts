import program from 'commander';
import { createDirIfNotExist } from './util/util';
import { INPUT_DATA_DEFAULTS, ImporterFiles } from './import/importer-input';
import { EditterFormats } from './edition/editter';

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
    .option('--edit-grandlivre', 'Edit Grand Livre.')
    .option('--edit-balance', 'Edit Balance Des Comptes.')
    .option('--edit-journal', 'Edit Journal Centraliseur.')
    .option('--edit-pieces', 'Edit Pièces.')
    .option('-d, --data-directory <path>', 'Directory for input data.')
    .option('-o, --ods [path]', 'ODS file containing accounting data')
    .option('-l, --list-csv <input-csv-path>', 'comma separated list', commaSeparatedList);


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

export interface ProgramArguments<StringOrBoolArg = string | boolean> {
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
    ods?: StringOrBoolArg;
    listCsv?: ImporterFiles<{ filename: string }>;
}

export function parseArgs(): ProgramArguments<string> {
    const args: ProgramArguments = program.parse(process.argv) as any;
    const programArgs: ProgramArguments<string> = { ...args } as any;

    programArgs.outputDir = args.outputDir || '.';
    createDirIfNotExist(args.outputDir);

    if (args.fecOnlyNonImported)
        programArgs.fec = programArgs.fec || true;

    const ods = args.ods;
    programArgs.ods = typeof ods === 'string' ? ods : INPUT_DATA_DEFAULTS.odsFilename; //  ods ? INPUT_DATA_DEFAULTS.odsFilename : undefined;


    const editKeys = [ 'editGrandLivre', 'editBalance', 'editJournal', 'editPieces' ];

    if (args.edit) {
        for (const k of editKeys) {
            if (args[ k ] === undefined)
                programArgs[ k ] = true;
        }
    }

    const needsEdit = editKeys.find(k => args[ k ]);
    if (needsEdit)
        programArgs.edit = true;


    if (editKeys.find(k => args[ k ] === true))
        programArgs.edit = true;

    if ((!args.editType || args.editType.length === 0) && programArgs.edit)
        programArgs.editType = Object.keys(new EditterFormats()) as any;

    return programArgs;
}

/* console.log(parseArgs());
process.exit(1); */
