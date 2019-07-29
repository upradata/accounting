import { Edit, EditOption } from '../../edition/edit';
import { ComptesBalance } from './comptes-balance';
import { flattenObject } from '../../util/util';
import { formattedNumber } from '../../util/compta-util';
import { coloryfyDiff } from '../../edition/edit-util';
import { TableColumns } from '../../edition/table';
import { BalanceTotalDetail, BalanceComptesCalculator } from './balance-compte-calculator.edit';


export class BalanceDesComptesEdit extends Edit {
    private balanceCompteCalculator: BalanceComptesCalculator;

    constructor(balance: ComptesBalance) {
        super({ title: 'Balance Des Comptes' });
        this.balanceCompteCalculator = new BalanceComptesCalculator(balance);
    }

    protected tableConfig() {
        const length = this.header()[ 1 ].length;

        const columns = {} as TableColumns;

        for (let i = 1; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit() {
        const header = this.header();

        this.consoleTable = [ ...header ];
        this.textTable = [ ...header ];
        this.editorOption.csv = header[ 1 ].join(';');
    }

    private header(): string[][] {
        /* const firstRow = Array(10).fill('');

        firstRow[ 0 ] = 'compte';
        firstRow[ 2 ] = 'A-nouveau';
        firstRow[ 5 ] = 'Exercise';
        firstRow[ 8 ] = 'Global'; */

        const firstRow = [ 'compte' ];

        firstRow.push(...Array(3).fill('A-nouveau'));
        firstRow.push(...Array(3).fill('Exercise'));
        firstRow.push(...Array(3).fill('Global'));

        const secondRow = [ '' ];

        const debitCreditDiff = [ 'Débit', 'Crédit', 'Solde' ];
        for (let i = 0; i < 3; ++i)
            secondRow.push(...debitCreditDiff);

        return [
            firstRow,
            secondRow
        ];
    }

    private addToEdit(balanceDataTotal: BalanceTotalDetail) {
        this.json[ balanceDataTotal.compte ] = balanceDataTotal;

        let flatten = Object.values(flattenObject(balanceDataTotal)) as Array<number | string>;
        const lastValue = flatten[ flatten.length - 1 ] as number;

        flatten = [ flatten[ 0 ], ...flatten.slice(1, -1).map(n => n === 0 ? '' : formattedNumber(n as number)), coloryfyDiff(lastValue) ];

        this.editorOption.csv += flatten.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(flatten);
        this.consoleTable.push(flatten);
    }


    doEdit(option: EditOption) {
        for (let i = 1; i < 8; ++i) {
            const balancesTotalI = this.balanceCompteCalculator.balancesRangeTotalI(i);

            if (!option.short) {
                for (const data of balancesTotalI)
                    this.addToEdit(data);
            }

            this.addToEdit(this.balanceCompteCalculator.balancesClassTotalI(i));
        }
    }
}
