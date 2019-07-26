import { table } from 'console';
import { EditTextFormatting } from '../../../accounting/edition/edit-text-formatting';
import { highlightMagenta } from '../../../accounting/util/color';
import { BalanceTotal } from '../../../accounting/accounting/balance/balance-total';
import { EditOption, Editter } from '../../../accounting/edition/editter';


/* interface BalanceEditData {
    compte: string;
    reouverture: BalanceTotalData;
    exercise: BalanceTotalData;
    global: BalanceTotalData;
} */

export interface BalanceDataTotal {
    compte: string;
    reouverture: BalanceTotal;
    exercise: BalanceTotal;
    global: BalanceTotal;
}


export class BalanceDesComptesEdit {
    private textFormatting = new EditTextFormatting({ lineWidth: 80 });
    private consoleFormatting = new EditTextFormatting({ lineWidth: process.stdout.columns });

    private editorOption: EditOption;
    private textTable: string[][];
    private consoleTable: string[][];

    constructor(private balance: Balance) {

    }

    private initEdit() {
        this.editorOption = { pdf: '', csv: '', text: '', console: '', json: '' };

        this.editorOption.text += this.textFormatting.title('Balance Des Comptes', { isBig: true });
        this.editorOption.console += this.consoleFormatting.title('Balance Des Comptes', { color: highlightMagenta, isBig: true });

        this.consoleTable = this.textTable = this.header();
    }


    private endEdit() {
        this.editorOption.text += table(this.textTable);
        this.editorOption.console += table(this.consoleTable);
    }

    private header(): string[][] {

        const firstRow = [ 'compte' ];

        firstRow.push(...Array(3).fill('A-nouveau'));
        firstRow.push(...Array(3).fill('Exercise'));
        firstRow.push(...Array(3).fill('Soldes'));

        const secondRow = [ '' ];

        const debitCreditDiff = [ 'debit', 'credit', 'diff' ];
        for (let i = 0; i < 3; ++i)
            secondRow.push(...debitCreditDiff);

        return [
            firstRow,
            secondRow
        ];
    }


    private balancesRangeTotalI(classNumero: number): BalanceDataTotal[] {
        const balances: BalanceDataTotal[] = [];

        const mille = Math.pow(10, 6);

        const balanceGlobalI = this.balance.getBalanceRange({ from: classNumero * mille, to: classNumero * mille - 1 });
        const balanceReouvertureI = balanceGlobalI.filter((numero, mouvement) => mouvement.journal === 'xou');
        const balanceExerciseI = balanceGlobalI.filter((numero, mouvement) => mouvement.journal !== 'xou');

        for (const { numero, balanceData } of balanceGlobalI) {

            const balancesCompte = {
                compte: numero,
                reouverture: balanceReouvertureI.getBalanceDataOfCompte(numero).total,
                exercise: balanceExerciseI.getBalanceDataOfCompte(numero).total,
                global: balanceData.total
            };

            balances.push(balancesCompte);
        }

        return balances;
    }


    private balancesClassTotalI(classNumero: number): BalanceDataTotal {

        return {
            compte: classNumero + '',
            reouverture: this.balance.getBalanceDataOfClass(classNumero, (numero, mouvement) => mouvement.journal === 'xou').total,
            exercise: this.balance.getBalanceDataOfClass(classNumero, (numero, mouvement) => mouvement.journal !== 'xou').total,
            global: this.balance.getBalanceDataOfClass(classNumero).total
        };

    }

    private addToEdit(balanceDataTotal: BalanceDataTotal) {
        this.editorOption.json += JSON.stringify(balanceDataTotal);

        const flatten = Object.values(flattenObject(balanceDataTotal)) as string[];
        this.editorOption.csv += flatten.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(flatten);
        this.consoleTable.push(flatten);
    }


    edit(editter: Editter): Promise<void[]> {
        this.initEdit();

        for (let i = 1; i < 8; ++i) {
            const balancesTotalI = this.balancesRangeTotalI(i);

            for (const data of balancesTotalI)
                this.addToEdit(data);

            this.addToEdit(this.balancesClassTotalI(i));
        }


        this.endEdit();

        return editter.edit(this.editorOption);
    }
}
