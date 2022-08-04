
import { ComptaDataMap } from './compta-data.types';


export interface ImporterFile {
    filename?: string;
    sheetName?: string | string[]; // for backward compatibility, the sheetName changed and we want to try all alternatives before emitting an error
    required?: boolean;
}


export interface ImporterOptionInput<T = string> {
    files: ImporterFiles<T>;
    odsFilename: string;
    directory: string;
}

export type ImporterFiles<T = ImporterFile> = ComptaDataMap<T>;


export const INPUT_DATA_DEFAULTS: ImporterOptionInput<ImporterFile> = {
    files: {
        ecritureSimples: { sheetName: [ 'EcrituresSimples', 'Depenses' ], filename: 'ecritures-simples.csv' },
        ecritureSimplePieces: { sheetName: [ 'EcritureSimplePieces', 'DepensePieces' ], filename: 'ecriture-simple-pieces.csv' },
        saisiePieces: { sheetName: 'SaisiePieces', filename: 'saisie-pieces.csv' },
        planComptable: { sheetName: 'PlanComptable', filename: 'plan-comptable.csv', required: true },
        journaux: { sheetName: 'Journaux', filename: 'journaux.csv', required: true },
        balanceReouverture: { sheetName: 'BalanceReouverture', filename: 'balance-reouverture.csv' },
        ecritureComptaGenerators: { sheetName: 'EcrituresComptaGenerators', filename: 'ecriture-compta-generators.csv' },
    },
    odsFilename: 'comptabilite.ods',
    directory: process.cwd()
};
