import { TableColumnConfig } from '@upradata/node-util';
import { composeLeft } from '@upradata/util';
import { objectToArray, formattedNumber } from '@util';
import { Edit, EditExtraOptions, coloryfyDiff } from '@edition';
import { ComptesBalance } from './comptes-balance';
import { BalanceComptesCalculator, Split } from './balance-compte-calculator.edit';
import { BalanceMapData, BalanceTotalData } from '../balance';


export class BalanceDesComptesEdit extends Edit {
    private balanceCompteCalculator: BalanceComptesCalculator;

    constructor(balance: ComptesBalance) {
        super({ title: 'Balance Des Comptes' });
        this.balanceCompteCalculator = new BalanceComptesCalculator(balance);
    }

    protected override doInit() {
        this.addHeaders(this.headers());
        this.setTableConfig(i => ({ alignment: i === 0 ? 'left' : 'right' }));
    }


    private headers() {
        /* const firstRow = Array(10).fill('');

        firstRow[ 0 ] = 'compte';
        firstRow[ 2 ] = 'A-nouveau';
        firstRow[ 5 ] = 'Exercise';
        firstRow[ 8 ] = 'Global'; */

        const firstRow = [ '' ];

        firstRow.push(...Array(3).fill('A-nouveau'));
        firstRow.push(...Array(3).fill('Exercise'));
        firstRow.push(...Array(3).fill('Global'));

        const secondRow = [ 'Compte' ];

        const debitCreditDiff = [ 'Débit', 'Crédit', 'Solde' ];
        for (let i = 0; i < 3; ++i)
            secondRow.push(...debitCreditDiff);

        return [
            firstRow,
            secondRow
        ];
    }


    private buildRow(balanceSplit: Split<BalanceTotalData>) {
        const row: (string | number)[] = [ balanceSplit.compte ];

        for (const splitType of [ 'reouverture', 'exercise', 'global' ])
            row.push(...objectToArray(balanceSplit[ splitType ] as BalanceTotalData, [ 'debit', 'credit', 'diff' ]));

        return row;
    }

    private addToEdit(balanceSplit: Split<BalanceTotalData>) {

        const row = this.buildRow(balanceSplit);

        const format = (data: string | number, i: number, length: number) => {
            if (i === 0 || i === length - 1)
                return `${data}`;

            formattedNumber(data, { zero: '' });
        };

        const colorify = (data: string | number, i: number, length: number) => {
            return i === length - 1 ? coloryfyDiff(data as number) : data;
        };


        this.addData({
            string: row.map(d => ({ value: d, format: s => composeLeft([ format, colorify ], s) })),
            json: { key: balanceSplit.compte, value: balanceSplit }
        });
    }

    protected override doEdit(option: EditExtraOptions) {
        const transformF = (b: BalanceMapData) => b.toBalanceTotalData().total;

        for (let i = 1; i < 8; ++i) {
            const balancesTotalI = this.balanceCompteCalculator.balanceClassSplit(i);

            if (!option.short) {
                for (const balance of balancesTotalI)
                    this.addToEdit(balance.transform(transformF));
            }

            this.addToEdit(this.balanceCompteCalculator.balancesClassTotalSplit(i).transform(transformF));
        }
    }
}
