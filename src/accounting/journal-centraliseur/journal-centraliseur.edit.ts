import { AppInjector } from '@upradata/dependency-injection';
import { isDefined, pipeline, removeUndefined } from '@upradata/util';
import {
    coloryfyDiff,
    Edit,
    EditDataCellStyle,
    EditDataStyledCell,
    EditExtraOptions,
    updateEditDataStyledCell
} from '@edition';
import { objectToArray } from '@util';
import { BalanceTotalData } from '../balance';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece';
import { JournauxBalance } from './journaux-balance';
import { JournauxBalanceByMonth, MonthYear } from './journaux-balance-by-month';


interface AddToEditOption {
    journal: string;
    mouvement?: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    total: BalanceTotalData;
    monthYear?: MonthYear;
}

export interface ExtraOption {
    byJournal?: boolean;
}

export class JournalCentraliseurEdit extends Edit {
    private isShort = false;
    private isByJournal = false;
    private currentMonth: string = '';
    private pieces: Pieces;


    constructor(private journauxBalanceByMonth: JournauxBalanceByMonth) {
        super({ title: 'Journal Centraliseur' });
        this.pieces = AppInjector.root.get(Pieces);
    }

    protected override doInit({ short }: EditExtraOptions) {
        this.isShort = short;
        this.addHeaders(this.headers());

        const format = (i: number, length: number): EditDataCellStyle => {

            const nbRight = this.isByJournal || this.isShort ? 3 : 5;

            if (i === 0 && this.isByJournal || i === 1)
                return { alignment: 'center' };

            if (i >= length - nbRight)
                return { alignment: 'right' };

            return { alignment: 'left' };
        };

        this.setTableFormat(format);
    }

    private headers() {
        if (this.isByJournal)
            return [ 'Journal', 'Débit', 'Crédit', 'Solde' ];

        if (this.isShort)
            return [ 'Month', 'Journal', 'Débit Exercise', 'Crédit Exercise', 'Solde' ];

        return [ 'Month', 'Journal', 'Date', 'Débit', 'Crédit', 'Débit Exercise', 'Crédit Exercise', 'Solde' ];
    }

    private balanceByJournal(): JournauxBalance {
        const journalBalance = new JournauxBalance();

        for (const { balance } of this.journauxBalanceByMonth) {
            for (const { balanceData } of balance)
                journalBalance.add(balanceData.mouvements);
        }

        return journalBalance;
    }

    private editByJournal() {
        const balanceByJournal = this.balanceByJournal();

        for (const { key: journal, balanceData } of balanceByJournal)
            this.addToEdit({ journal, total: balanceData.total.data });
    }

    private getMonth(dateMonth: number) {
        const date = new Date(2019, dateMonth); // year is not important
        const m = date.toLocaleString('fr-FR', { month: 'long' });

        const month = this.currentMonth === m ? '' : m;
        this.currentMonth = m;

        return month;
    }


    private addToEdit({ journal, mouvement, total, monthYear }: AddToEditOption) {

        const getBareData = () => {
            if (isDefined(mouvement)) {
                const { type, montant } = mouvement;

                const debit = type === 'debit' ? montant : '';
                const credit = type === 'credit' ? montant : '';

                const d = this.pieces.get(mouvement.pieceId).date;
                const date = d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';

                return { credit, debit, date };
            }

            return { credit: '', debit: '', date: '' };
        };

        const { debit: totalDebit, credit: totalCredit, diff: solde } = total;

        const getData = () => {
            const data = { journal, totalDebit, totalCredit, solde, month: undefined, date: undefined, debit: undefined, credit: undefined };

            if (this.isByJournal)
                return data;

            const month = this.getMonth(monthYear.month);

            if (this.isShort)
                return { ...data, month };

            return { ...data, ...getBareData(), month, };

        };

        const dataO = removeUndefined(getData());

        const row = objectToArray(dataO, [ 'month', 'journal', 'date', 'debit', 'credit', 'totalDebit', 'totalCredit', 'solde' ]);


        const format = (i: number) => (data: EditDataStyledCell): EditDataStyledCell => {
            const nbRight = this.isByJournal ? 1 : this.isShort ? 2 : 3;
            return updateEditDataStyledCell(data, { style: { type: i >= nbRight && i < row.length - 1 ? 'number' : 'text' } });
        };


        const colorify = (data: EditDataStyledCell) => {
            if (data.style?.type !== 'number')
                return data;

            const { value, color } = coloryfyDiff(data.value as number, { zero: '' });
            return updateEditDataStyledCell(data, { value, style: { ...data.style, color } });
        };


        this.addData({
            string: row,
            json: { key: journal, value: dataO },
            format: (data, i) => pipeline({ value: data }).pipe(format(i)).pipe(colorify).value
        });
    }


    protected override doEdit(_option: EditExtraOptions) {

        if (this.isByJournal)
            return this.editByJournal();


        for (const { monthYear, balance } of this.journauxBalanceByMonth) {
            for (const { key: journal, balanceData } of balance) {

                if (!this.isShort) {
                    for (const mouvement of balanceData.mouvements) {
                        this.addToEdit({ journal, mouvement, total: balanceData.total.data, monthYear });
                    }
                }

                this.addToEdit({ journal, total: balanceData.total.data, monthYear });
            }
        }
    }
}
