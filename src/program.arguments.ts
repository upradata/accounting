import fs from 'fs-extra';
import { isDefined, assignRecursive, AssignOptions, keys } from '@upradata/util';
import { createCli, fromDir, lookupRoot, parsers as cliParsers } from '@upradata/node-util';
import { logger, numberWithLeadingZeros } from '@util';
import { ImporterFiles, INPUT_DATA_DEFAULTS } from '@import';
import { EditterFormats } from '@edition';

const fromThisRoot = fromDir(lookupRoot.sync(__dirname));

const command = createCli({ packageJson: fromThisRoot('package.json') });

command
    .description('Accounting. Generates FEC, Balances Comptes, Grand Livre, Journal Centralisateur and Pièces.')
    .option('-s, --exercise-start <date>', `Start date of the exercise in DDMMYYYY format
    (By default, the exercise start is taken from metadata.json and the current year).`, value => {
        const zeros = numberWithLeadingZeros;
        return new Date(`${parseInt(value.slice(4, 8))}-${zeros(parseInt(value.slice(2, 4)), 2)}-${zeros(parseInt(value.slice(0, 2)), 2)}`);
    })
    .option('-m, --metadata <path>', 'Metadata of the accounting.', fromThisRoot('metadata.json'))
    .option('-o, --output-dir <path>', 'Output directory for the edition.', '.')
    .option('-f, --fec [path | bool]', 'Generate fec.', cliParsers.try(cliParsers.boolean), true)
    .option('-F, --fec-only-non-imported [bool]', 'Generate fec (only non imported data in accounting software).', cliParsers.boolean, false)
    .option('-e, --edit [bool]', 'Edit accounting: Balance Des Comptes, Journal Centraliseur, Grand Livre et Pièces.', cliParsers.boolean, true)
    .option({
        flags: '--editters <...type>',
        description: `Editter logger types [ ${keys(EditterFormats).join(', ')} ].
        It possible to pass few options using few --editters like --editters csv --editters console or
        using a comma separated list like --editters csv,console).`,
        parser: cliParsers.stringToArray({ separator: ',', parser: cliParsers.choices(keys(EditterFormats)) }),
        aliases: [ { flags: '--editter <type>' } ],
        defaultValue: 'csv' as any
    })
    .option('--json-indent <nb>', 'Json indentation for the json editter.', cliParsers.int, 4)
    .option('--edit-short [bool]', 'Edit accounting condensed mode.', cliParsers.boolean, true)
    .option('--edit-grand-livre [bool]', 'Edit Grand Livre.', cliParsers.boolean)
    .option('--edit-balance [bool]', 'Edit Balance Des Comptes.', cliParsers.boolean)
    .option('--edit-journal [bool]', 'Edit Journal Centraliseur.', cliParsers.boolean)
    .option('--edit-pieces [bool]', 'Edit Pièces.', cliParsers.boolean)
    .option('-d, --data-directory <path>', 'Directory for input data.', INPUT_DATA_DEFAULTS.directory)
    .option('-o, --input-ods [path]', 'ODS file containing accounting data.', INPUT_DATA_DEFAULTS.odsFilename)
    .option('-l, --input-csv <input-csv-path>', 'CSV file(s) containing accounting data (comma separated list).',
        cliParsers.compose(cliParsers.stringToArray({ separator: ',' }), cliParsers.reduce({}, (o, value) => {
            const [ key, filename ] = value.split(':');
            o[ key.trim() ] = { filename: filename.trim() };

            return o;
        })));




export class InputArguments<StringOrBoolArg extends string | boolean> {
    exerciseStart?: Date;
    metadata?: string;
    outputDir: string;
    fec?: string | boolean;
    fecOnlyNonImported?: boolean;
    edit?: boolean;
    editters?: (keyof EditterFormats)[];
    jsonIndent?: number;
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


export class ProgramArguments extends InputArguments<string> {
    constructor(consoleArgs: ConsoleArguments) {
        super();
        assignRecursive(this, consoleArgs, new AssignOptions({ props: keys(InputArguments), arrayMode: 'replace' }));

        const enableEdit = keys(this).some(k => k.startsWith('edit') && !!this[ k ]);

        if (enableEdit) {
            this.edit = true;

            if (!this.editters)
                this.editters = [ 'console', 'csv' ];
        }

        const editKeys = [ 'editGrandLivre', 'editBalance', 'editJournal', 'editPieces' ];
        const specificEditSpecified = editKeys.some(k => consoleArgs[ k ]);


        // by default, if "edit" is true => all edits are true also (the same for false)
        // but if a specific edit is specified, the rest is false
        // the Object.assign is doing the affectation and thus isDefined is true
        for (const k of editKeys) {
            if (this.edit) {
                // eslint-disable-next-line no-unneeded-ternary
                this[ k ] = isDefined(this[ k ]) ? this[ k ] : specificEditSpecified ? false : true;
            } else
                this[ k ] = false;
        }

        if (this.fecOnlyNonImported)
            this.fec = true;
    }
}

export const parseArgs = async (): Promise<ProgramArguments> => {
    command.parse();
    const args = new ProgramArguments(command.opts());

    await fs.ensureDir(args.outputDir);

    return args;
};


command.configureOutput({
    // Visibly override write routines as example!
    writeOut: s => logger.info(s),
    writeErr: s => logger.error(s),
    // Highlight errors in color.
    // outputError: (s, write) => write(red`${s}`)
});
