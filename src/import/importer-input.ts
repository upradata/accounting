
import { fromDirIfRel } from '@upradata/node-util';
import { ComptaDataMap } from './compta-data.types';


export interface ImporterFile {
    filename?: string;
    sheetName?: string;
    required?: boolean;
}


export interface ImporterOptionInput<T = string> {
    files: ImporterFiles<T>;
    odsFilename: string;
    directory: string;
}

export type ImporterFiles<T = ImporterFile> = ComptaDataMap<T>;


const defaultDataDirectory = '.';
const dir = fromDirIfRel(defaultDataDirectory);

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
    directory: defaultDataDirectory
};
