import { ComptesBalance, CompteRange } from './comptes-balance';
import { Mouvement } from '../mouvement';
import { BalanceMapData } from '../balance/balance-map-data';

export class Split<T = BalanceMapData> {
    compte: string;
    reouverture: T;
    exercise: T;
    global: T;
}


export class BalanceComptesSplit extends Split {

    constructor(args: Split) {
        super();
        Object.assign(this, args);
    }

    getBalances() {
        const { reouverture, exercise, global } = this;
        return { reouverture, exercise, global };
    }
    transform<T>(f: (split: BalanceMapData) => T): Split<T> {
        const { compte } = this;

        const totalDataBalances = Object.entries(this.getBalances())
            .map(([ key, balanceData ]) => [ key, f(balanceData) ]);


        return { compte, ...Object.fromEntries(totalDataBalances) };
    }
}

/* export class SplitList {
    constructor(private split: BalanceComptesSplit) { }


    get(compte: string) {
        Object.entries(this.split.getBalances())
            .map(([ key, balanceData ]) => [ key, balanceData. ]);
    }

} */


const filter = (test: (mouvement: Mouvement) => boolean) => (numero, mouvement) => test(mouvement);
const newKey = (numero: string, mouvement) => numero[ 0 ];
const lower = (s: string) => s.toLocaleLowerCase();

export class BalanceComptesCalculator {
    constructor(public balance: ComptesBalance) { }

    balanceRangeSplit(compteRange?: CompteRange): BalanceComptesSplit[] {
        const balances: BalanceComptesSplit[] = [];

        const balanceGlobalI = !compteRange ? this.balance : this.balance.getBalanceRange(compteRange);
        const balanceReouvertureI = balanceGlobalI.filter({ filter: filter(m => lower(m.journal) === 'xou') });
        const balanceExerciseI = balanceGlobalI.filter({ filter: filter(m => lower(m.journal) !== 'xou') });

        for (const { key: numero, balanceData } of balanceGlobalI) {

            // the reason I do total.data is because total.diff is a getter property and it is not enumarable.
            // Then Object.entries/keys/... will not work. So I transform the instance of BalanceTotal in a plain object of type BalanceTotalData
            const balancesCompte = new BalanceComptesSplit({
                compte: numero,
                reouverture: balanceReouvertureI.getBalanceDataOfKey(numero),
                exercise: balanceExerciseI.getBalanceDataOfKey(numero),
                global: balanceData
            });

            balances.push(balancesCompte);
        }

        return balances;
    }

    balanceClassSplit(classNumero: number): BalanceComptesSplit[] {
        const million = Math.pow(10, 6);
        console.log('IIII ==> ', classNumero, this.balanceRangeSplit({ from: classNumero * million, to: (classNumero + 1) * million - 1 }).map(b => b.compte));
        return this.balanceRangeSplit({ from: classNumero * million, to: (classNumero + 1) * million - 1 });
    }

    balancesClassTotalSplit(classNumero: number): BalanceComptesSplit {

        return new BalanceComptesSplit({
            compte: classNumero + '',
            reouverture: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) === 'xou'), newKey }),
            exercise: this.balance.getBalanceDataOfClass(classNumero, { filter: filter(m => lower(m.journal) !== 'xou'), newKey }),
            global: this.balance.getBalanceDataOfClass(classNumero, { newKey })
        });
    }
}
