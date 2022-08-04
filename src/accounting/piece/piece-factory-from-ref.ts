import { mapBy } from '@util';
import { ComptaEcritureSimplePiece } from '@import/compta-data.types';
import { PieceOption, Piece } from './piece';



export interface PiecesFromPieceRefOption {
    comptaEcritureSimplesPieces: ComptaEcritureSimplePiece[];
    pieceRef: string;
    pieceOption: Omit<PieceOption, 'journal'>;
}

export function getPiecesFromPieceRef({ comptaEcritureSimplesPieces, pieceRef, pieceOption }: PiecesFromPieceRefOption): Piece[] {
    // Example: in EcrituresSimples sheet, pieceRef = piece-reductuion-capital
    // In EcrituresSimplesPieces, there can ba few pieces => piece-reductuion-capital#1, piece-reductuion-capital#2, ... with few ecritures
    const piecesRegex = new RegExp(`^${pieceRef}#\\d+`);

    const piecesById = mapBy(comptaEcritureSimplesPieces, 'id');
    const comptaPiecesByIdFiltered = Object.values(piecesById).filter(ecritures => piecesRegex.test(ecritures[ 0 ].id));
    // all possible pieces

    if (!comptaPiecesByIdFiltered)
        return [];

    const pieces: Piece[] = [];

    for (const comptaPiece of comptaPiecesByIdFiltered) {
        const piece: Piece = new Piece({ ...pieceOption, journal: comptaPiece[ 0 ].journal });

        for (const { compteInfo, credit, debit } of comptaPiece) {
            piece.addMouvement({
                montant: credit || debit, type: credit ? 'credit' : 'debit',
                compteInfo
            });
        }

        if (piece.tryClose())
            pieces.push(piece);
    }

    return pieces;
}
