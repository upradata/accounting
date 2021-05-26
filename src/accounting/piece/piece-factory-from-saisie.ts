import { mapBy } from '@util';
import { isDefined } from '@upradata/util';
import { ComptaSaisieMouvement } from '@import';
import { Compte, CompteInfo } from '../compte';
import { Piece } from './piece';


export class PiecesfromSaisiePieces {

    static getPieces(saisieMouvements: ComptaSaisieMouvement<number, Date, Compte>[]): Piece[] {
        const pieces: Piece[] = [];

        const saisiePieces = mapBy(saisieMouvements, 'id');
        for (const mouvements of Object.values(saisiePieces)) {

            const { journal, libelle, date } = mouvements[ 0 ];
            const isImported = isDefined(mouvements.find(m => m.isImported));
            const piece = new Piece({ journal, libelle, date, isImported });

            for (const mouvement of mouvements) {
                const { compte, compteAux, debit, credit } = mouvement;
                const isCredit = credit !== undefined;

                if (isDefined(credit) && isDefined(debit)) {
                    if (mouvement.journal.toLowerCase() === 'xou') {
                        // only for journal réouverture, on autorise une saisie avec crédit et débit en même temps
                        piece.addMouvement({
                            montant: credit, type: 'credit', compteInfo: new CompteInfo({ compte, compteAux })
                        });
                        piece.addMouvement({
                            montant: debit, type: 'debit', compteInfo: new CompteInfo({ compte, compteAux })
                        });

                    } else {
                        throw new Error(`Un saisie de peut avoir une colonne crédit et débit en même temps: Mouvement => ${mouvement}`);
                    }

                } else {
                    piece.addMouvement({
                        montant: isCredit ? credit : debit, type: isCredit ? 'credit' : 'debit',
                        compteInfo: new CompteInfo({ compte, compteAux })
                    });
                }

            }

            if (piece.tryClose())
                pieces.push(piece);
        }

        return pieces;
    }
}
