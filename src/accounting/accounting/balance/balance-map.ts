import { SortedArray } from '../../util/sorted-array';
import { Mouvement } from '../mouvement';
import { SortedMap } from '../../util/sorted-map';
import { BalanceTotal, BalanceTotalData } from './balance-total';
import { BalanceFilter } from '../balance-comptes/comptes-balance';
import { isIterable } from '../../util/util';



export interface BalanceData {
    mouvements: SortedArray<Mouvement>;
    total: BalanceTotal;
}


export interface BalanceMapIteratorResult<K> {
    key: K;
    balanceData: BalanceData;
}


export class FilterParams {
    done: boolean = false;
    pass: boolean;

    constructor(param: { done?: boolean; pass?: boolean } | boolean | undefined) {
        if (typeof param === 'boolean')
            this.pass = param;
        else if (typeof param === 'undefined')
            this.pass = false;
        else {
            Object.assign(this, { pass: false, done: false }, param);
        }
    }
}


export type BalanceMapFilter<K> = (key: K, mouvement: Mouvement) => { done?: boolean; pass?: boolean } | boolean | undefined;


export interface BalanceMapFilterOption<K> {
    filter: BalanceMapFilter<K>;
    newKey?: (key: K, mouvement: Mouvement) => K;
}


export class BalanceMapOption<K> {
    keyCompare?: (keyLeft: K, keyRight: K) => number = (keyLeft: K, keyRight: K) => {
        if (keyLeft === keyRight) return 0;
        const [ k1, k2 ] = [ keyLeft, keyRight ].sort();
        return k1 === keyLeft ? -1 : 1;
    }
    keyFromMouvement: (mouvement: Mouvement) => K;
    keyMutation?: (key: K) => K = k => k;
}


export class BalanceMap<Key> {
    balanceMap: SortedMap<Key, BalanceData>;
    private options: BalanceMapOption<Key>;

    constructor(balanceMapOption: BalanceMapOption<Key>) {
        this.options = Object.assign(new BalanceMapOption(), balanceMapOption);
        this.balanceMap = new SortedMap(undefined, undefined, this.options.keyCompare);
    }

    add(mouvements: Mouvement | Iterable<Mouvement>, key?: Key) {
        const mouvementsList = isIterable<Mouvement>(mouvements) ? mouvements : [ mouvements ];

        for (const mouvement of mouvementsList) {
            const balanceCompte = this.getBalanceDataOfKey(key || this.options.keyFromMouvement(mouvement));

            balanceCompte.mouvements.push(mouvement);
            balanceCompte.total.add(mouvement);
        }
    }

    getBalanceDataOfKey(key: Key): BalanceData {
        const keyMuted = this.options.keyMutation(key);
        let data = this.balanceMap.get(keyMuted);

        if (!data) {
            data = {
                mouvements: new SortedArray(
                    undefined,
                    (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
                    (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
                ), // ordered by date
                total: new BalanceTotal()
            };
            this.balanceMap.set(keyMuted, data);
        }

        return data;
    }

    filter({ filter, newKey = (k, m) => k }: BalanceMapFilterOption<Key>) {
        const balanceFiltered = new BalanceMap<Key>(this.options);

        for (const { key, balanceData } of this) {
            for (const mouvement of balanceData.mouvements) {
                const ret = filter(key, mouvement);
                const { pass, done } = new FilterParams(ret);

                if (pass) {
                    balanceFiltered.add(mouvement, newKey(key, mouvement));
                    if (done) // shortcut if rest of balanceMap is useless
                        return balanceFiltered;
                }
            }
        }

        return balanceFiltered;
    }


    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ](): IterableIterator<BalanceMapIteratorResult<Key>> {
        for (const { key, value: balanceData } of this.balanceMap) {
            yield { key, balanceData };
            // const { mouvements, total } = balanceData;
            // yield { key, balanceData: { mouvements, total: total.data } };
            // the reason I do total.data is because total.diff is a getter property and it is not enumarable.
            // Then Object.entries/keys/... will not work. So I transform the instance of BalanceTotal in a plain object
        }
    }
}
