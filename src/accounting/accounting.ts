import path from 'path';
import { Inject } from '@upradata/dependency-injection';
import { PartialRecursive } from '@upradata/util';
import { logger, dateToFecDate } from '@util';
import { Importer, ImporterFile, ImporterOption } from '@import';
import { ComptabiliteMetadata, PlanComptable, Journaux, EcritureComptaGenerators } from '@metadata';
import { Pieces, PiecesFromEcrituresSimples, PiecesfromSaisiePieces } from './piece';
import { FecBuilderOption, FecBuilder } from './fec-builder';
import { LettrageProcessor } from './lettrage';
import { GrandLivre } from './grand-livre';
import { BalanceDesComptes } from './balance-comptes';
import { JournalCentraliseur } from './journal-centraliseur';
import { AccountingInterface } from './accounting.interface';



export class Accounting implements Partial<AccountingInterface> {
    public metadata: ComptabiliteMetadata;

    constructor(
        @Inject(GrandLivre) public grandLivre?: GrandLivre,
        @Inject(BalanceDesComptes) public balanceDesComptes?: BalanceDesComptes,
        @Inject(JournalCentraliseur) public journalCentraliseur?: JournalCentraliseur,
        @Inject(PlanComptable) public planComptable?: PlanComptable,
        @Inject(Journaux) public journaux?: Journaux,
        @Inject(Pieces) public pieces?: Pieces,
        @Inject(EcritureComptaGenerators) public ecritureComptaGenerators?: EcritureComptaGenerators,
        @Inject(ComptabiliteMetadata) public comptabiliteMetadata?: ComptabiliteMetadata) { }


    importComptaData(option?: PartialRecursive<ImporterOption<ImporterFile>>) {
        const importer = new Importer(option);

        return importer.importAll().then(data => {
            if (data.ecritureComptaGenerators)
                this.ecritureComptaGenerators.add(data.ecritureComptaGenerators);

            this.pieces.add(...new PiecesFromEcrituresSimples(data.ecritureSimplePieces).getPieces(data.ecritureSimples));
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
            logger.error(`Erro while writing FEC file in ${output}: ${e.message}`);
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
