import { logger } from '@util';
import { entries } from '@upradata/util';
import { PieceOption, Piece } from './piece';
import { MouvementData } from '../mouvement';
import { CompteParentAux } from '../compte';


export function getPieceFromString(credit: string, debit: string, pieceOption: PieceOption): Piece | undefined {
    const { libelle } = pieceOption;


    if (!pieceOption.journal) {
        logger.error(`La ligne "${libelle}" n'a pas de journal`);
        return undefined;
    }


    const piece = new Piece(pieceOption);

    for (const [ type, mouvementString ] of entries({ debit, credit })) {
        const mouvements = getDataFromString(mouvementString).map(data => ({ ...data, type }));
        piece.addMouvement(...mouvements);
    }


    if (piece.tryClose())
        return piece;
}


function getDataFromString(s: string): Omit<MouvementData<string | number>, 'type'>[] {
    const movements = s.split(';');

    const compteMontantList = movements.map(m => {
        const [ comptes, montant ] = m.split(':');
        const [ compte, compteAux ] = comptes.split('.');

        return { compteInfo: new CompteParentAux({ compte, compteAux }), montant };
    });

    return compteMontantList;
}
