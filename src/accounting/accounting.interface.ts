import { PartialRecursive } from '@upradata/util';
import { ImporterOption, ImporterFile } from '@import';
import { PlanComptable, Journaux, ComptabiliteMetadata } from '@metadata';
import { FecBuilderOption } from './fec-builder';
import { GrandLivre } from './grand-livre';
import { BalanceDesComptes } from './balance-comptes';
import { JournalCentraliseur } from './journal-centraliseur';
import { Pieces } from './piece';



export interface AccountingInterface {

    grandLivre: GrandLivre;
    balanceDesComptes: BalanceDesComptes;
    journalCentraliseur: JournalCentraliseur;
    planComptable: PlanComptable;
    journaux: Journaux;
    pieces: Pieces;
    comptabiliteMetadata: ComptabiliteMetadata;
    importComptaData(option: PartialRecursive<ImporterOption<ImporterFile>>): Promise<void>;
    generateFec(fecBuilderOption: FecBuilderOption & { outputDir: string; outputFilename: string; }): Promise<void>;
    processLettrage(): void;
}
