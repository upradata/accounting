import { mapBy } from '@util/util';
import { isUndefined } from '@upradata/util';
import { ComptaDepensePiece } from '@import';
import { PieceOption, Piece } from './piece';
import { CompteParentAux } from '../compte';



export interface PiecesFromPieceRefOption {
    comptaDepensePieces: ComptaDepensePiece[];
    pieceRef: string;
    pieceOption: Omit<PieceOption, 'journal'>;
}

export function getPiecesFromPieceRef({ comptaDepensePieces, pieceRef, pieceOption }: PiecesFromPieceRefOption): Piece[] {
    // Example: in Depenses sheet, pieceRef = piece-reductuion-capital
    // In DepensePieces, there can ba few pieces => piece-reductuion-capital#1, piece-reductuion-capital#2, ... with few ecritures
    const piecesRegex = new RegExp(`^${pieceRef}#\\d+`);

    const piecesById = mapBy(comptaDepensePieces, 'id');
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
                compteInfo: new CompteParentAux({ compte, compteAux })
            });
        }

        if (piece.tryClose())
            pieces.push(piece);
    }

    return pieces;
}
