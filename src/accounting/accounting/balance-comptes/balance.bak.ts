import { SortedArray } from '../../util/sorted-array';
import { Mouvement } from '../mouvement';
import { SortedMap } from '../../util/sorted-map';
import { Compte } from '../compte';
import { CompteKey } from '../grand-livre/type';
import { BalanceTotal } from './balance-total';

export interface BalanceData {
    mouvements: SortedArray<Mouvement>;
    total: BalanceTotal;
}


export interface BalanceIteratorResult {
    numero: string;
    balanceData: BalanceData;
}

export type BalanceFilter = (numero: string | number, mouvement: Mouvement) => boolean;

export class Balance {
    balance: SortedMap<CompteKey, BalanceData>;

    constructor() {
        this.balance = new SortedMap(undefined, undefined,
            // numeric enables whether numeric collation should be used, such that "1" < "2" < "10".
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
            // compares
            (l: CompteKey, r: CompteKey) => l.localeCompare(r, undefined, { numeric: true }),
            // getDefault()
            /* (k: CompteKey) => new SortedArray(
                undefined,
                (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
                (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
            ) // ordered by date  */
        );
    }


    add(mouvements: Mouvement | Mouvement[], compteNumero?: string) {
        const mouvementsList = Array.isArray(mouvements) ? mouvements : [ mouvements ];

        for (const mouvement of mouvementsList) {
            const balanceCompte = this.getBalanceDataOfCompte(compteNumero || mouvement.compteInfo.compte.numero);

            balanceCompte.mouvements.push(mouvement);
            balanceCompte.total.add(mouvement);
            //  const balanceTotal = this.getBalanceOf(mouvement.compteInfo.compte.numero[ 0 ]);

            /* for (const balance of [ balanceCompte, balanceTotal ]) {
                balance.mouvements.push(mouvement);
                balance.total.add(mouvement);
            } */
        }
    }

    getBalanceDataOfCompte(compteNumero: string | number): BalanceData {
        const classNumeroFull = Compte.pad(compteNumero);
        let data = this.balance.get(classNumeroFull);

        if (!data) {
            data = {
                mouvements: new SortedArray(
                    undefined,
                    (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
                    (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
                ), // ordered by date
                total: new BalanceTotal()
            };
            this.balance.set(classNumeroFull, data);
        }

        return data;
    }

    getBalanceDataOfClass(classNumero: string | number, filterFunc: BalanceFilter = (numero, data) => true): BalanceData {
        const balanceClass = new Balance();
        const classNumeroFull = Compte.pad(classNumero);

        for (const { numero, balanceData } of this) {
            if (parseFloat(numero[ 0 ]) > parseFloat(classNumeroFull[ 0 ]))
                break;

            if (numero[ 0 ] === classNumeroFull[ 0 ]) { //  classNumero[ 0 ] to be sure it is between 1 to 7
                for (const mouvement of balanceData.mouvements)
                    if (filterFunc(numero, mouvement))
                        balanceClass.add(mouvement, classNumeroFull);
            }
        }

        return balanceClass.balance.get(classNumeroFull);
    }


    getBalanceRange(compteRange: { from: string | number, to: string | number }): Balance {
        const from = parseFloat(Compte.pad(compteRange.from));
        const to = parseFloat(Compte.pad(compteRange.to));

        const balanceRange = new Balance();

        for (const b of this) {
            for (const mouvement of b.balanceData.mouvements) {
                const numero = parseFloat(mouvement.compteInfo.compte.numero);

                if (numero >= from && from <= to)
                    balanceRange.add(mouvement);

                if (numero > to)
                    return balanceRange;
            }
        }

        return balanceRange;
    }

    filter(filterFunc: BalanceFilter) {
        const balanceFiltered = new Balance();

        for (const { numero, balanceData } of this) {
            for (const mouvement of balanceData.mouvements) {
                if (filterFunc(numero, mouvement))
                    balanceFiltered.add(mouvement, numero);
            }
        }

        return balanceFiltered;
    }


    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ](): IterableIterator<BalanceIteratorResult> {
        for (const { key: compteNumero, value: balanceData } of this.balance)
            yield { numero: compteNumero, balanceData };
    }
}
