import { PieceOption, Piece } from './piece';
import { MouvementType } from '../../util/types';
import { MouvementData } from '../mouvement';
import { CompteInfo } from '../compte';


export function getPieceFromString(credit: string, debit: string, pieceOption: PieceOption): Piece {
    const { libelle } = pieceOption;


    if (!pieceOption.journal) {
        console.error(`Le champ "${libelle}" n'a pas de journal`);
        return undefined;
    }


    const piece = new Piece(pieceOption);

    for (const [ type, mouvementString ] of Object.entries({ debit, credit })) {
        for (const data of getDataFromString(mouvementString))
            piece.addMouvement({ type: type as MouvementType, ...data });
    }


    piece.close();
    return piece;
}


function getDataFromString(s: string): Omit<MouvementData<string | number>, 'type'>[] {
    const movements = s.split(';');

    const compteMontantList = movements.map(m => {
        const [ comptes, montant ] = m.split(':');
        const [ compte, compteAux ] = comptes.split('.');

        return { compteInfo: new CompteInfo({ compte, compteAux }), montant };
    });

    return compteMontantList;
}
