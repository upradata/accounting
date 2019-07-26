import { PartialRecursive } from '../../../linked-modules/@mt/browser-util/type';
import { ImporterOption, ImporterFile } from '../import/importer';
import { FecBuilderOption } from './fec-builder';
import { GrandLivre } from './grand-livre/grand-livre';
import { BalanceDesComptes } from './balance-comptes/balance-des-comptes';
import { JournalCentraliseur } from './journal-centraliseur/journal-centraliseur';
import { PlanComptable } from '../metadata/plan-comptable';
import { Journaux } from '../metadata/journaux';
import { Pieces } from './piece/pieces';
import { ComptabiliteMetadata } from '../metadata/accounting-metadata';


export interface AccountingInterface {

    grandLivre: GrandLivre;
    balanceDesComptes: BalanceDesComptes;
    journalCentraliseur: JournalCentraliseur;
    planComptable: PlanComptable;
    journaux: Journaux;
    pieces: Pieces;
    comptabiliteMetadata: ComptabiliteMetadata;
    importComptaData(option: PartialRecursive<ImporterOption<ImporterFile>>): Promise<void>;
    generateFec(fecBuilderOption: FecBuilderOption & { outputDir: string; outputFilename: string }): Promise<void>;
    processLettrage(): void;
}
