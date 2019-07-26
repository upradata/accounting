import { Edit } from '../../edition/edit';
import { CompteBalance } from './compte-balance';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece/pieces';
import { Injector } from '../../util/di';


interface AddToEditOption {
    compte: string;
    mouvement?: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    solde?: number;
}

export class MouvementsCompteEdit extends Edit {
    private pieces: Pieces;

    constructor(private compteBalance: CompteBalance) {
        super({ title: 'Grand Livre Des Ecritures' });
        this.pieces = Injector.app.get(Pieces);
    }


    private initEdit() {
        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';');
    }

    private header(): string[] {
        return [ 'Compte', 'Date', 'Pièce', 'Débit', 'Crédit', 'Solde' ];
    }

    private addToEdit({ compte, mouvement, solde }: AddToEditOption) {
        let { debit = '', credit = '', dateString = '', pieceId = '' } = {};

        if (solde === undefined) {
            const { type, montant, date } = mouvement;
            pieceId = mouvement.pieceId;
            pieceId += ': ' + this.pieces.get(pieceId).libelle;

            debit = type === 'debit' ? `${montant}` : '';
            credit = type === 'credit' ? `${montant}` : '';
            dateString = date ? date.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';
        }

        const data = [ compte, dateString, pieceId, debit, credit, solde ];

        this.editorOption.csv += data.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(data);
        this.consoleTable.push(data);
    }


    doEdit() {
        this.initEdit();

        for (const { key: compte, balanceData } of this.compteBalance) {
            const { mouvements, total } = balanceData;

            /* const piecesBalance: BalanceMap<string> = new BalanceMap({
                keyCompare: (l, r) => l.localeCompare(r),
                keyFromMouvement: mouvement => mouvement.pieceId,
            });

            piecesBalance.add(mouvements.array); */

            // const mouvementsByPiece = arrayToObjOfArrayById(mouvements, 'pieceId');

            this.json[ compte ] = mouvements;

            for (const mouvement of mouvements) {
                this.addToEdit({ compte, mouvement });
            }

            this.addToEdit({
                compte,
                solde: total.data.diff
            });
        }
    }
}
