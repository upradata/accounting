import { PieceOption, Piece } from './piece';
import { ComptaDepensePiece } from '../../import/compta-data';
import { Compte, CompteInfo } from '../compte';
import { arrayToObjOfArrayById } from '../../util/util';
import { isUndefined } from 'util';


export interface PiecesFromPieceRefOption {
    comptaDepensePieces: ComptaDepensePiece<number, Compte>[];
    pieceRef: string;
    pieceOption: Omit<PieceOption, 'journal'>;
}

export function getPiecesFromPieceRef({ comptaDepensePieces, pieceRef, pieceOption }: PiecesFromPieceRefOption): Piece[] {
    // Example: in Depenses sheet, pieceRef = piece-reductuion-capital
    // In DepensePieces, there can ba few pieces => piece-reductuion-capital#1, piece-reductuion-capital#2, ... with few ecritures
    const piecesRegex = new RegExp(`^${pieceRef}#\\d+`);

    const piecesById = arrayToObjOfArrayById(comptaDepensePieces, 'id');
    const comptaPiecesByIdFiltered = Object.values(piecesById).filter(ecritures => piecesRegex.test(ecritures[ 0 ].id));
    // all possible pieces

    if (!comptaPiecesByIdFiltered) return [];

    const pieces: Piece[] = [];

    for (const comptaPiece of comptaPiecesByIdFiltered) {
        let piece: Piece = undefined;

        for (const { compte, compteAux, credit, debit, journal } of comptaPiece) {
            if (isUndefined(piece))
                piece = new Piece({ ...pieceOption, journal });

            piece.addMouvement({
                montant: credit || debit, type: credit ? 'credit' : 'debit',
                compteInfo: new CompteInfo({ compte, compteAux })
            });
        }

        piece.close();
        pieces.push(piece);
    }

    return pieces;
}
