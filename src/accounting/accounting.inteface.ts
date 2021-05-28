import { PartialRecursive } from '@upradata/util';
import { FecBuilderOption } from './fec-builder';
import { GrandLivre } from './grand-livre/grand-livre';
import { BalanceDesComptes } from './balance-comptes/balance-des-comptes';
import { JournalCentraliseur } from './journal-centraliseur/journal-centraliseur';
import { PlanComptable } from '../metadata/plan-comptable';
import { Journaux } from '../metadata/journaux';
import { Pieces } from './piece/pieces';
import { ComptabiliteMetadata } from '../metadata/accounting-metadata';
import { ImporterOption } from '../import/importer-option';
import { ImporterFile } from '../import/importer-input';


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
