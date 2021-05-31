import path from 'path';
import { PartialRecursive } from '@upradata/util';
import { logger, InjectDep, dateToFecDate } from '@util';
import { Importer, ImporterFile, ImporterOption } from '@import';
import { ComptabiliteMetadata, PlanComptable, Journaux } from '@metadata';
import { Pieces, PiecesFromDepense, PiecesfromSaisiePieces } from './piece';
import { FecBuilderOption, FecBuilder } from './fec-builder';
import { LettrageProcessor } from './lettrage';
import { GrandLivre } from './grand-livre/grand-livre';
import { BalanceDesComptes } from './balance-comptes';
import { JournalCentraliseur } from './journal-centraliseur';
import { AccountingInterface } from './accounting.inteface';



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
            this.pieces.add(...new PiecesFromDepense(data.depensesPieces).getPieces(data.depenses));
            this.pieces.add(...PiecesfromSaisiePieces.getPieces(data.saisiePieces));
            this.pieces.add(...PiecesfromSaisiePieces.getPieces(data.balanceReouverture));
        });
    }


    generateFec(fecBuilderOption: FecBuilderOption & { outputDir?: string; outputFilename?: string; }): Promise<void> {
        const fecBuilder = new FecBuilder(fecBuilderOption);
        fecBuilder.generate(this.grandLivre.mouvements.array);

        const { siren, exercisePeriod } = this.comptabiliteMetadata;
        const defaultFecFilename = `${siren}FEC${dateToFecDate(exercisePeriod.end)}.txt`;

        const { outputDir = '.', outputFilename = defaultFecFilename } = fecBuilderOption;
        const output = path.join(outputDir, outputFilename);

        return fecBuilder.writeFile(output).catch((e: Error) => {
            logger.error(`Writting in ${output} error: ${e.message}`);
            logger.error(e);
        });
    }


    processLettrage() {
        const mouvementsNonLettrable = new LettrageProcessor(this.grandLivre.mouvements.array).process();

        if (mouvementsNonLettrable) {
            const mouvementsLog = mouvementsNonLettrable.map(m => `mouvement ${m.id} de la piece ${m.pieceId}`).join('\n');
            logger.info(`Mouvements non lettrables: ${mouvementsLog}`);
        }
    }

}
