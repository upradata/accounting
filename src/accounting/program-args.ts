import program from 'commander';

program
    .version('1.0.0')
    .option('-S, --exercise-start <date>', `Start date of the exercise in DDMMYYYY format`)
    .option('-I, --ods <path>', 'ODS file containing accounting data')
    .option('-M, --metadata <path>', 'Metadata of the accounting')
    .option('-F, --fec [path]', 'Generate fec')
    .option('-E, --edit [path]', 'Edit accounting: Balance Des Comptes, Journal Centraliseur et Grand Livre');


export interface ProgramArguments {
    exerciseStart: string;
    ods?: string;
    metadata?: string;
    fec?: string | boolean;
    edit?: string | boolean;
}

export const programArgs: ProgramArguments = program.parse(process.argv) as any;
