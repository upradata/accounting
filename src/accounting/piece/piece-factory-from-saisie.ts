import { ComptaSaisieMouvement } from '../../import/compta-data';
import { Compte, CompteInfo } from '../compte';
import { Piece } from './piece';
import { arrayToObjOfArrayById } from '../../util/util';
import { isDefined } from '@upradata/util';

export class PiecesfromSaisiePieces {

    static getPieces(saisieMouvements: ComptaSaisieMouvement<number, Date, Compte>[]): Piece[] {
        const pieces: Piece[] = [];

        const saisiePieces = arrayToObjOfArrayById(saisieMouvements, 'id');
        for (const mouvements of Object.values(saisiePieces)) {

            const { journal, libelle, date } = mouvements[ 0 ];
            const isImported = isDefined(mouvements.find(m => m.isImported));
            const piece = new Piece({ journal, libelle, date, isImported });

            for (const mouvement of mouvements) {

                const { compte, compteAux, debit, credit } = mouvement;
                const isCredit = credit !== undefined;

                piece.addMouvement({
                    montant: isCredit ? credit : debit, type: isCredit ? 'credit' : 'debit',
                    compteInfo: new CompteInfo({ compte, compteAux })
                });

            }

            if (piece.tryClose())
                pieces.push(piece);
        }

        return pieces;
    }
}
