import { Edit, EditOption } from '../../edition/edit';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece/pieces';
import { Injector } from '../../util/di';
import { BalanceTotalData } from '../balance/balance-total';
import { formattedNumber } from '../../util/compta-util';
import { coloryfyDiff } from '../../edition/edit-util';
import { TableColumns } from '../../edition/table';
import { ObjectOf } from '../../util/types';
import { BalanceComptesCalculator } from '../balance-comptes/balance-compte-calculator.edit';
import { ComptesBalance } from '../balance-comptes/comptes-balance';
import { flattenObject } from '../../util/util';
import { BalanceMapData } from '../balance/balance-map-data';


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
    private balanceCompteCalculator: BalanceComptesCalculator;
    private isShort = false;

    constructor(private compteBalance: ComptesBalance) {
        super({ title: 'Grand Livre Des Ecritures' });

        this.pieces = Injector.app.get(Pieces);
        this.balanceCompteCalculator = new BalanceComptesCalculator(compteBalance);
    }


    protected tableConfig() {
        const length = this.header().length;

        const columns = {} as TableColumns;

        for (let i = 3; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit(option: EditOption) {
        this.isShort = option.short;

        const header = this.header();

        this.consoleTable = [ ...header ];
        this.textTable = [ ...header ];
        this.editorOption.csv = header[ 1 ].join(';');
    }

    private header(): string[][] {
        const firstRow = [ '' ];

        firstRow.push(...Array(3).fill('A-nouveau'));
        firstRow.push(...Array(3).fill('Exercise'));
        firstRow.push(...Array(3).fill('Global'));

        const secondRow = [ 'Compte' ];

        if (!this.isShort)
            secondRow.push('Date', 'Pièce');


        const debitCreditDiff = [ 'Débit', 'Crédit', 'Solde' ];
        for (let i = 0; i < 3; ++i)
            secondRow.push(...debitCreditDiff);

        return [
            firstRow,
            secondRow
        ];
    }

    private formatRow(row: Array<number | string>) {
        const lastValue = row[ row.length - 1 ] as number;

        const start = row.slice(0, this.isShort ? 1 : 3);
        const middle = row.slice(this.isShort ? 1 : 3, -1);


        return [ ...start, ...middle.map(n => n === 0 ? '' : formattedNumber(n as number)), coloryfyDiff(lastValue) ];
    }

    // { compte, mouvement, balanceTotal }: AddToEditOption
    private addToEdit(balanceSplit: Split<>) {

        this.json[ balanceSplit.compte ] = balanceSplit;

        const flatten = Object.values(flattenObject(balanceSplit)) as Array<number | string>;
        const row = this.formatRow(flatten);

        this.editorOption.csv += row.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(row);
        this.consoleTable.push(row);



        let { debit = '', credit = '', dateString = '', pieceId = '' } = {};
        let solde: string = '';

        if (!this.isShort) {
            const { type, montant, date } = balanceSplit.global.;
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

        const transformF = (b: BalanceMapData) => b.toBalanceTotalData();

        const balancesSplit = this.balanceCompteCalculator.balanceRangeSplit();

        if (!option.short) {
            for (const data of balancesSplit) {
                const splitBalances = data.transform(transformF);
                const { total, mouvements } = splitBalances.global;

                for (const mouvement of mouvements) {

                    this.addToEdit(data.transform(transformF));
                }
            }

            // this.addToEdit(this.balanceCompteCalculator.balancesClassTotalSplit(i));

        }
    }
}
