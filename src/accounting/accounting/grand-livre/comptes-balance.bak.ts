import { BalanceMap, BalanceMapData } from '../balance/balance-map';
import { Compte } from '../compte';

export type CompteKey = string;

// export type CompteBalance = BalanceMap<CompteKey>;
export class ComptesBalance extends BalanceMap<CompteKey> {
    constructor() {
        super({
            keyCompare: (l, r) => l.localeCompare(r, undefined, { numeric: true }),
            keyFromMouvement: mouvement => mouvement.compteInfo.compte.numero,
            keyMutation: compteNumero => Compte.pad(compteNumero)
        });
    }

    get(compteNumero: string | number): BalanceMapData {
        return this.getBalanceDataOfKey(compteNumero + '');
    }

}
