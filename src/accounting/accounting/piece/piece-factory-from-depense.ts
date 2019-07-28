import { ComptaDepensePiece, ComptaDepense } from '../../import/compta-data';
import { Compte } from '../compte';
import { Piece } from './piece';
import { arrayToObjOfArrayById } from '../../util/util';
import { getPiecesFromPieceRef } from './piece-factory-from-ref';
import { getPieceFromString } from './piece-factory-from-string';
import { PieceFromLibelle, PREDIFINED_GENERATORS } from './pieces-from-libelle';

export class PiecesFromDepense {

    constructor(private depensePieces: ComptaDepensePiece<number, Compte>[]) { }

    getPieces(compteDepenses: ComptaDepense<number, Date>[]): Piece[] {
        const pieces: Piece[] = [];

        for (const depenses of Object.values(arrayToObjOfArrayById(compteDepenses, 'id'))) {

            for (const depense of depenses) {

                const { libelle, ttc, ht, tva, date, journal, credit, debit, pieceRef } = depense;

                if (pieceRef)
                    pieces.push(
                        ...getPiecesFromPieceRef({ comptaDepensePieces: this.depensePieces, pieceRef, pieceOption: { libelle, date } })
                    );

                if (credit || debit) {
                    const piece = getPieceFromString(credit, debit, { libelle, date, journal });
                    if (piece)
                        pieces.push(piece);
                }

                pieces.push(... new PieceFromLibelle(PREDIFINED_GENERATORS).generate({ libelle, ttc, ht, tva, date }));
            }
        }

        return pieces;
    }

}
