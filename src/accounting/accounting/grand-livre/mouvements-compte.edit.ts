import { Edit, EditOption } from '../../edition/edit';
import { CompteBalance } from './compte-balance';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece/pieces';
import { Injector } from '../../util/di';
import { BalanceTotalData } from '../balance/balance-total';
import { formattedNumber } from '../../util/compta-util';
import { coloryfyDiff } from '../../edition/edit-util';
import { TableColumns } from '../../edition/table';
import { ObjectOf } from '../../util/types';


interface AddToEditOption {
    compte: string;
    mouvement?: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    balanceTotal?: BalanceTotalData;
}

export class MouvementsCompteEdit extends Edit {
    private pieces: Pieces;
    private isShort = false;

    constructor(private compteBalance: CompteBalance) {
        super({ title: 'Grand Livre Des Ecritures' });
        this.pieces = Injector.app.get(Pieces);
    }


    protected tableConfig() {
        const length = this.header().length;

        const columns = {} as TableColumns;

        for (let i = length - 3; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit(option: EditOption) {
        this.isShort = option.short;

        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';');
    }

    private header(): string[] {
        if (this.isShort)
            return [ 'Compte', 'Débit', 'Crédit', 'Solde' ];

        return [ 'Compte', 'Date', 'Pièce', 'Débit', 'Crédit', 'Solde' ];
    }

    private addToEdit({ compte, mouvement, balanceTotal }: AddToEditOption) {
        let { debit = '', credit = '', dateString = '', pieceId = '' } = {};
        let solde: string = '';

        if (balanceTotal === undefined) {
            const { type, montant, date } = mouvement;
            pieceId = mouvement.pieceId;
            pieceId += ': ' + this.pieces.get(pieceId).libelle;

            const m = montant === 0 ? '' : formattedNumber(montant);

            debit = type === 'debit' ? `${m}` : '';
            credit = type === 'credit' ? `${m}` : '';
            dateString = date ? date.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';
        } else {
            credit = formattedNumber(balanceTotal.credit);
            debit = formattedNumber(balanceTotal.debit);
            solde = coloryfyDiff(balanceTotal.diff);
        }

        let dataO: ObjectOf<string | number> = undefined;

        if (this.isShort)
            dataO = { compte, debit, credit, solde };
        else
            dataO = { compte, dateString, pieceId, debit, credit, solde };


        const data = Object.values(dataO);

        this.json[ compte ] = { dateString, pieceId, debit, credit, solde };

        this.editorOption.csv += data.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(data);
        this.consoleTable.push(data);
    }


    doEdit(option: EditOption) {

        for (const { key: compte, balanceData } of this.compteBalance) {
            const { mouvements, total } = balanceData;

            if (!option.short) {
                for (const mouvement of mouvements) {
                    this.addToEdit({ compte, mouvement });
                }
            }

            this.addToEdit({
                compte,
                balanceTotal: total.data
            });
        }
    }
}
