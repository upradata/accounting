import { Compte } from '../compte';
import { BalanceMap, BalanceMapFilterOption } from '../balance/balance-map';
import { Mouvement } from '../mouvement';
import { BalanceMapData } from '../balance/balance-map-data';

export type Numero = string | number;

export type BalanceFilter = (numero: Numero, mouvement: Mouvement) => boolean;

export interface BalanceFilterOption {
    filter?: BalanceFilter;
    newKey?: BalanceMapFilterOption<CompteKey>[ 'newKey' ];
}

export interface CompteRange {
    from: Numero;
    to: Numero;
}

export type CompteKey = string; // compte numero

export class ComptesBalance extends BalanceMap<CompteKey> {

    constructor() {
        super({
            keyCompare: (l, r) => l.localeCompare(r, undefined, { numeric: true }),
            keyFromMouvement: mouvement => mouvement.compteInfo.compte.numero,
            keyMutation: compteNumero => Compte.pad(compteNumero)
        });
    }

    static createFromBalanceMap(balanceMap: BalanceMap<CompteKey>) {
        const balance = new ComptesBalance();
        balance.balanceMap = balanceMap.balanceMap;

        return balance;
    }

    get(compteNumero: Numero): BalanceMapData {
        return this.getBalanceDataOfKey(compteNumero + '');
    }

    getBalanceDataOfClass(classNumero: Numero, filterOption: BalanceFilterOption = {}): BalanceMapData {
        const { filter = (numero, mouvement) => true, newKey = (numero, mouvement) => numero } = filterOption;

        const classNumeroFull = Compte.pad(classNumero);

        const balanceMap = this.filter({
            filter: (compteNumero, mouvement) => {
                if (parseFloat(compteNumero[ 0 ]) > parseFloat(classNumeroFull[ 0 ]))
                    return { done: true };

                if (compteNumero[ 0 ] === classNumeroFull[ 0 ] && filter(compteNumero, mouvement))
                    return { pass: true };

                return { pass: false };
            },
            newKey
        });

        return balanceMap.getBalanceDataOfKey(classNumeroFull);
    }


    getBalanceRange(compteRange: CompteRange): ComptesBalance {
        const from = parseFloat(Compte.pad(compteRange.from));
        const to = parseFloat(Compte.pad(compteRange.to));

        const balanceMap = this.filter({
            filter: (compteNumero, mouvement) => {
                const numero = parseFloat(mouvement.compteInfo.compte.numero);

                if (numero < from)
                    return { pass: false };

                if (numero >= from && numero <= to)
                    return { pass: true };

                // if (numero > to)
                return { done: true };
            }
        });


        return ComptesBalance.createFromBalanceMap(balanceMap);
    }
}
