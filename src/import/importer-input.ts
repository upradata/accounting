
import * as path from 'path';


export interface ImporterFile {
    filename?: string;
    sheetName?: string;
    required?: boolean;
}

export class ImporterFiles<T = string> {
    planComptable: T = undefined;
    journaux: T = undefined;
    depenses?: T = undefined;
    depensesPieces?: T = undefined;
    saisiePieces?: T = undefined;
    balanceReouverture?: T = undefined;
}


export interface ImporterOptionInput<T> {
    files: ImporterFiles<T>;
    odsFilename: string;
    directory: string;
}

const defaultDirectory = path.join(__dirname, '../../data/');
const dir = (p: string) => path.join(defaultDirectory, p);

export const INPUT_DATA_DEFAULTS: ImporterOptionInput<ImporterFile> = {
    files: {
        depenses: { sheetName: 'Depenses', filename: dir('depenses.csv') },
        depensesPieces: { sheetName: 'DepensePieces', filename: dir('depenses-pieces.csv') },
        saisiePieces: { sheetName: 'SaisiePieces', filename: dir('saisie-pieces.csv') },
        planComptable: { sheetName: 'PlanComptable', filename: dir('plan-comptable.csv'), required: true },
        journaux: { sheetName: 'Journaux', filename: dir('journaux.csv'), required: true },
        balanceReouverture: { sheetName: 'BalanceReouverture', filename: dir('balance-reouverture.csv') }
    },
    odsFilename: 'comptabilite.ods',
    directory: defaultDirectory
};
