import { TableColumnConfig } from '@upradata/node-util';
import { ObjectOf } from '@upradata/util';
import { Injector, formattedNumber, objectToArray } from '@util';
import { Edit, EditOption, coloryfyDiff } from '@edition';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece';
import { BalanceTotalData } from '../balance';
import { ComptesBalance } from '../balance-comptes';


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

export class GrandLivreEdit extends Edit {
    private pieces: Pieces;
    private isShort = false;

    constructor(private compteBalance: ComptesBalance) {
        super({ title: 'Grand Livre Des Ecritures' });
        this.pieces = Injector.app.get(Pieces);
    }

    doInit(option: EditOption) {
        this.isShort = option.short;

        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';') + '\n';
    }


    protected tableConfig() {
        const length = this.header().length;

        const columns = {} as TableColumnConfig;

        for (let i = length - 3; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    private header(): string[] {
        if (this.isShort)
            return [ 'Compte', 'Débit', 'Crédit', 'Solde' ];

        return [ 'Compte', 'Date', 'Pièce', 'Période', 'Débit', 'Crédit', 'Solde' ];
    }

    private formatRow(row: Array<number | string>) {
        const middleIndex = this.isShort ? 1 : 4;

        const start = row.slice(0, middleIndex);
        const middle = row.slice(middleIndex, -1);
        const end = row[ row.length - 1 ];

        return [ ...start, ...middle.map(n => n === 0 || n === '' ? '' : formattedNumber(n)), end ];
    }

    private colorifyRow(row: Array<number | string>) {
        const lastValue = row[ row.length - 1 ] as number;
        return [ ...row.slice(0, -1), coloryfyDiff(lastValue) ];
    }


    private addToEdit({ compte, mouvement, balanceTotal }: AddToEditOption) {
        let { debit = '', credit = '', date = '', pieceId = '', period = '' } = {} as ObjectOf<string | number>;
        let solde: string | number = '';

        if (balanceTotal === undefined) {
            const { type, montant, date: d } = mouvement;

            const piece = this.pieces.get(mouvement.pieceId);
            pieceId += `${mouvement.pieceId}: ${piece.libelle}`;

            const m = montant === 0 ? '' : montant; // formattedNumber(montant);

            debit = type === 'debit' ? `${m}` : '';
            credit = type === 'credit' ? `${m}` : '';
            date = d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';

            period = piece.journal.toLowerCase() === 'xou' ? 'A-Nouveau' : 'Exercise';
        } else {
            credit = balanceTotal.credit;
            debit = balanceTotal.debit;
            solde = balanceTotal.diff;
        }

        let dataO: ObjectOf<string | number> = undefined;

        if (this.isShort)
            dataO = { compte, debit, credit, solde };
        else
            dataO = { compte, date, pieceId, period, debit, credit, solde };


        const row = objectToArray(dataO, [ 'compte', 'date', 'pieceId', 'period', 'debit', 'credit', 'solde' ]);
        const rowFormatted = this.formatRow(row);

        this.setJson(compte, dataO);

        this.editorOption.csv += row.join(';') + '\n';

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(rowFormatted);
        this.consoleTable.push(this.colorifyRow(rowFormatted));
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
