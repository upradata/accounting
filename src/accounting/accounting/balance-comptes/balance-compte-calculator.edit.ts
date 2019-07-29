import { ComptesBalance } from './comptes-balance';
import { BalanceTotalData } from '../balance/balance-total';
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

export class BalanceComptesCalculator {
    constructor(public balance: ComptesBalance) { }

    balancesRangeTotalI(classNumero: number): BalanceTotalDetail[] {
        const balances: BalanceTotalDetail[] = [];

        const mille = Math.pow(10, 6);

        const balanceGlobalI = this.balance.getBalanceRange({ from: classNumero * mille, to: (classNumero + 1) * mille - 1 });
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

    balancesClassTotalI(classNumero: number): BalanceTotalDetail {

        return {
            compte: classNumero + '',
            reouverture: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) === 'xou'), newKey }).total.data,
            exercise: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) !== 'xou'), newKey }).total.data,
            global: this.balance.getBalanceDataOfClass(classNumero, { newKey }).total.data
        };

    }
}
