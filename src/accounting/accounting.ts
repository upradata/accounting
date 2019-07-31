import { ComptabiliteMetadata } from '../metadata/accounting-metadata';
import { InjectDep } from '../util/di';
import { PlanComptable } from '../metadata/plan-comptable';
import { Journaux } from '../metadata/journaux';
import { Pieces } from './piece/pieces';
import { Importer } from '../import/importer';
import { PiecesFromDepense } from './piece/piece-factory-from-depense';
import { PiecesfromSaisiePieces } from './piece/piece-factory-from-saisie';
import { FecBuilderOption, FecBuilder } from './fec-builder';
import { loggerService } from '../util/logger';
import { LettrageProcessor } from './lettrage';
import { GrandLivre } from './grand-livre/grand-livre';
import { PartialRecursive } from '../util/types';
import { dateToFecDate } from '../util/compta-util';
import * as path from 'path';
import { BalanceDesComptes } from './balance-comptes/balance-des-comptes';
import { JournalCentraliseur } from './journal-centraliseur/journal-centraliseur';
import { AccountingInterface } from './accounting.inteface';
import { ImporterOption } from '../import/importer-option';
import { ImporterFile } from '../import/importer-input';



export class Accounting implements Partial<AccountingInterface> {
    public metadata: ComptabiliteMetadata;

    constructor(
        @InjectDep(GrandLivre) public grandLivre?: GrandLivre,
        @InjectDep(BalanceDesComptes) public balanceDesComptes?: BalanceDesComptes,
        @InjectDep(JournalCentraliseur) public journalCentraliseur?: JournalCentraliseur,
        @InjectDep(PlanComptable) public planComptable?: PlanComptable,
        @InjectDep(Journaux) public journaux?: Journaux,
        @InjectDep(Pieces) public pieces?: Pieces,
        @InjectDep(ComptabiliteMetadata) public comptabiliteMetadata?: ComptabiliteMetadata) { }


    importComptaData(option?: PartialRecursive<ImporterOption<ImporterFile>>) {
        const importer = new Importer(option);

        return importer.importAll().then(data => {
            this.pieces.add(...new PiecesFromDepense(data.depensePieces).getPieces(data.depenses));
            this.pieces.add(...PiecesfromSaisiePieces.getPieces(data.saisies));
            this.pieces.add(...PiecesfromSaisiePieces.getPieces(data.balanceReouverture));
        });
    }


    generateFec(fecBuilderOption: FecBuilderOption & { outputDir?: string; outputFilename?: string }): Promise<void> {
        const fecBuilder = new FecBuilder(fecBuilderOption);
        fecBuilder.generate(this.grandLivre.mouvements.array);

        const { siren, exercisePeriod } = this.comptabiliteMetadata;
        const defaultFecFilename = siren + 'FEC' + dateToFecDate(exercisePeriod.end) + '.txt';

        const { outputDir = '.', outputFilename = defaultFecFilename } = fecBuilderOption;
        const output = path.join(outputDir, outputFilename);

        return fecBuilder.writeFile(output).catch((e: Error) => {
            loggerService.error(`Writting in ${output} error: ${e.message}`);
        });
    }


    processLettrage() {
        const mouvementsNonLettrable = new LettrageProcessor(this.grandLivre.mouvements.array).process();

        if (mouvementsNonLettrable) {
            let mouvementsLog = '';
            for (const m of mouvementsNonLettrable)
                mouvementsLog += `mouvement ${m.id} de la piece ${m.pieceId}` + '\n';

            loggerService.info(`Mouvements non lettrables: ${mouvementsLog}`);
        }
    }

}
