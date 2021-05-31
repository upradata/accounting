import { TableColumnConfig } from '@upradata/node-util';
import { objectToArray, formattedNumber } from '@util';
import { Edit, EditOption, coloryfyDiff } from '@edition';
import { ComptesBalance } from './comptes-balance';
import { BalanceComptesCalculator, Split } from './balance-compte-calculator.edit';
import { BalanceMapData, BalanceTotalData } from '../balance';


export class BalanceDesComptesEdit extends Edit {
    private balanceCompteCalculator: BalanceComptesCalculator;

    constructor(balance: ComptesBalance) {
        super({ title: 'Balance Des Comptes' });
        this.balanceCompteCalculator = new BalanceComptesCalculator(balance);
    }

    protected tableConfig() {
        const length = this.header()[ 1 ].length;

        const columns = {} as TableColumnConfig;

        for (let i = 1; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit() {
        const header = this.header();

        this.consoleTable = [ ...header ];
        this.textTable = [ ...header ];
        this.editorOption.csv = header[ 1 ].join(';') + '\n';
    }

    private header(): string[][] {
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

    private formatRow(row: Array<number | string>) {
        const start = row[ 0 ];
        const middle = row.slice(1, -1);
        const end = row[ row.length - 1 ];

        return [ start, ...middle.map(n => n === 0 ? '' : formattedNumber(n as number)), end ];
    }

    private colorifyRow(row: Array<number | string>) {
        const lastValue = row[ row.length - 1 ] as number;
        return [ ...row.slice(0, -1), coloryfyDiff(lastValue) ];
    }

    private buildRow(balanceSplit: Split<BalanceTotalData>) {
        const row: (string | number)[] = [ balanceSplit.compte ];

        for (const splitType of [ 'reouverture', 'exercise', 'global' ])
            row.push(...objectToArray(balanceSplit[ splitType ] as BalanceTotalData, [ 'debit', 'credit', 'diff' ]));

        return row;
    }

    private addToEdit(balanceSplit: Split<BalanceTotalData>) {

        this.setJson(balanceSplit.compte, balanceSplit);

        const row = this.buildRow(balanceSplit);
        const rowFormatted = this.formatRow(row);

        this.editorOption.csv += row.join(';') + '\n';

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(row);
        this.consoleTable.push(this.colorifyRow(rowFormatted));
    }

    doEdit(option: EditOption) {
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
