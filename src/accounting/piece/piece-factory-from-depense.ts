import { values } from '@upradata/util';
import { mapBy, logger } from '@util';
import { ComptaDepensePiece, ComptaDepense } from '@import';
import { Compte } from '../compte';
import { Piece } from './piece';
import { getPiecesFromPieceRef } from './piece-factory-from-ref';
import { getPieceFromString } from './piece-factory-from-string';
import { PieceFromLibelle, PREDIFINED_GENERATORS } from './pieces-from-libelle';



export class PiecesFromDepense {

    constructor(private depensePieces: ComptaDepensePiece<number, Compte>[]) { }

    getPieces(compteDepenses: ComptaDepense<number, Date, boolean>[]): Piece[] {
        const depensesById = mapBy(compteDepenses, 'id');

        const pieces: Piece[] = values(depensesById).flatMap(depenses => depenses.flatMap(depense => {
            const { libelle, ttc, ht, tva, date, journal, credit, debit, pieceRef, isImported } = depense;

            if (pieceRef)
                return getPiecesFromPieceRef({ comptaDepensePieces: this.depensePieces, pieceRef, pieceOption: { libelle, date, isImported } });

            if (credit || debit)
                return getPieceFromString(credit, debit, { libelle, date, journal, isImported });

            const pieces = new PieceFromLibelle(PREDIFINED_GENERATORS).generate({ libelle, ttc, ht, tva, date, isImported });

            if (pieces.length === 0)
                logger.error(`Impossible de générer de pièces pour la ligne avec le libellé "${libelle}".`);

            return pieces;
        })).filter(v => !!v);


        return pieces;
    }

}
