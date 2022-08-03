import { values } from '@upradata/util';
import { AppInjector } from '@upradata/dependency-injection';
import { ComptaDepense, ComptaDepensePiece } from '@import';
import { EcritureComptaGenerators } from '@metadata';
import { logger, mapBy } from '@util';
import { Piece } from './piece';
import { getPiecesFromPieceRef } from './piece-factory-from-ref';
import { getPieceFromString } from './piece-factory-from-string';
import {
    generateFromLibelle,
    generatorFromType,
    PREDIFINED_GENERATORS,
    PREDIFINED_LIBELLE_GENERATORS
} from './pieces-generators';



export class PiecesFromDepense {

    constructor(private depensePieces: ComptaDepensePiece[]) { }

    getPieces(compteDepenses: ComptaDepense[]): Piece[] {
        const depensesById = mapBy(compteDepenses, 'id');

        const pieces: Piece[] = values(depensesById).flatMap(depenses => depenses.flatMap(depense => {
            const { libelle, ttc, ht, tva, date, journal, creditMouvement, debitMouvement, pieceRef, isImported, type } = depense;

            if (pieceRef)
                return getPiecesFromPieceRef({ comptaDepensePieces: this.depensePieces, pieceRef, pieceOption: { libelle, date, isImported } });

            if (creditMouvement || debitMouvement)
                return getPieceFromString(creditMouvement, debitMouvement, { libelle, date, journal, isImported });

            if (type) {
                try {
                    const { generators } = AppInjector.root.get(EcritureComptaGenerators);

                    if (generators[ type ])
                        return generators[ type ]({ libelle, ttc, ht, tva, date, isImported });

                    return generatorFromType(PREDIFINED_GENERATORS)(type)({ libelle, ttc, ht, tva, date, isImported });
                } catch (e) {
                    logger.error(e);
                    logger.info(`Let's try to generate from the "libelle"`);
                }
            }

            const pieces = generateFromLibelle(PREDIFINED_LIBELLE_GENERATORS)({ libelle, ttc, ht, tva, date, isImported });

            if (pieces.length === 0)
                logger.error(`Impossible de générer de pièces pour la ligne avec le libellé "${libelle}".`);

            return pieces;
        })).filter(v => !!v);


        return pieces;
    }

}
