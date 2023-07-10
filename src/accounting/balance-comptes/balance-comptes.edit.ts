import { pipeline } from '@upradata/util';
import { coloryfyDiff, Edit, EditDataStyledCell, EditExtraOptions, updateEditDataStyledCell } from '@edition';
import { objectToArray } from '@util';
import { BalanceMapData, BalanceTotalData } from '../balance';
import { BalanceComptesCalculator, Split } from './balance-compte-calculator.edit';
import { ComptesBalance } from './comptes-balance';


export class BalanceDesComptesEdit extends Edit {
    private balanceCompteCalculator: BalanceComptesCalculator;

    constructor(balance: ComptesBalance) {
        super({ title: 'Balance Des Comptes' });
        this.balanceCompteCalculator = new BalanceComptesCalculator(balance);
    }

    protected override doInit() {
        this.addHeaders(this.headers());
        this.setTableFormat(i => ({ alignment: i === 0 ? 'left' : 'right' }));
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

        const format = (i: number) => (data: EditDataStyledCell): EditDataStyledCell => {
            return updateEditDataStyledCell(data, { style: { type: i === 0 ? 'text' : 'number' } });
        };

        const colorify = (i: number, data: EditDataStyledCell): EditDataStyledCell => {
            if (data.style?.type !== 'number')
                return data;

            if ((i - 1) % 3 !== 2)
                return { ...data, value: data.value === 0 ? '' : data.value };

            const { value, color } = coloryfyDiff(data.value as number, { zero: '' });
            return updateEditDataStyledCell(data, { value, style: { ...data.style, color } });
        };


        this.addData({
            string: row,
            format: (data, i, _length) => pipeline({ value: data }).pipe(format(i)).pipe(data => colorify(i, data)).value,
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
