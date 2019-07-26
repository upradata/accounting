import { Edit } from '../../edition/edit';
import { BalanceTotal, BalanceTotalData } from '../balance/balance-total';
import { ComptesBalance } from './comptes-balance';
import { flattenObject } from '../../util/util';
import { Mouvement } from '../mouvement';

export interface BalanceTotalDetail {
    compte: string;
    reouverture: BalanceTotalData;
    exercise: BalanceTotalData;
    global: BalanceTotalData;
}


const filter = (test: (mouvement: Mouvement) => boolean) => (numero, mouvement) => test(mouvement);
const newKey = (numero: string, mouvement) => numero[ 0 ];
const lower = (s: string) => s.toLocaleLowerCase();


export class BalanceDesComptesEdit extends Edit {

    constructor(private balance: ComptesBalance) {
        super({ title: 'Balance Des Comptes' });
    }

    private initEdit() {
        const header = this.header();

        this.consoleTable = header;
        this.textTable = header;
        this.editorOption.csv = header[ 1 ].join(';');
    }

    private header(): string[][] {

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


    private balancesRangeTotalI(classNumero: number): BalanceTotalDetail[] {
        const balances: BalanceTotalDetail[] = [];

        const mille = Math.pow(10, 6);


        const balanceGlobalI = this.balance.getBalanceRange({ from: classNumero * mille, to: classNumero * mille - 1 });
        const balanceReouvertureI = balanceGlobalI.filter({ filter: filter(m => lower(m.journal) === 'xou') });
        const balanceExerciseI = balanceGlobalI.filter({ filter: filter(m => lower(m.journal) !== 'xou') });

        for (const { key: numero, balanceData } of balanceGlobalI) {

            // the reason I do total.data is because total.diff is a getter property and it is not enumarable.
            // Then Object.entries/keys/... will not work. So I transform the instance of BalanceTotal in a plain object of type BalanceTotalData
            const balancesCompte = {
                compte: numero,
                reouverture: balanceReouvertureI.getBalanceDataOfKey(numero).total.data,
                exercise: balanceExerciseI.getBalanceDataOfKey(numero).total.data,
                global: balanceData.total.data
            };

            balances.push(balancesCompte);
        }

        return balances;
    }


    private balancesClassTotalI(classNumero: number): BalanceTotalDetail {

        return {
            compte: classNumero + '',
            reouverture: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) === 'xou'), newKey }).total.data,
            exercise: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) !== 'xou'), newKey }).total.data,
            global: this.balance.getBalanceDataOfClass(classNumero, { newKey }).total.data
        };

    }

    private addToEdit(balanceDataTotal: BalanceTotalDetail) {
        this.json[ balanceDataTotal.compte ] = balanceDataTotal;

        const flatten = Object.values(flattenObject(balanceDataTotal)) as Array<number | string>;
        this.editorOption.csv += flatten.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(flatten);
        this.consoleTable.push(flatten);
    }


    doEdit() {
        this.initEdit();

        for (let i = 1; i < 8; ++i) {
            const balancesTotalI = this.balancesRangeTotalI(i);

            for (const data of balancesTotalI)
                this.addToEdit(data);

            this.addToEdit(this.balancesClassTotalI(i));
        }
    }
}
