import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { GrandLivreEdit } from './mouvements-compte.edit';
import { BalanceMap, BalanceData } from '../balance/balance-map';
import { Compte } from '../compte';
import { EditOption } from '../../edition/edit';
import { ComptesBalance } from './comptes-balance';


export class MouvementsByCompte {
    private mouvementsByCompte: ComptesBalance;

    constructor() {
        this.mouvementsByCompte = new BalanceMap({
            keyCompare: (l, r) => l.localeCompare(r, undefined, { numeric: true }),
            keyFromMouvement: mouvement => mouvement.compteInfo.compte.numero,
            keyMutation: compteNumero => Compte.pad(compteNumero)
        });
    }

    add(...mouvements: Mouvement[]) {
        this.mouvementsByCompte.add(mouvements);
    }

    get(compteNumero: string | number): BalanceData {
        return this.mouvementsByCompte.getBalanceDataOfKey(compteNumero + '');
    }


    edit(editter: Editter, option?: EditOption): Promise<void[]> {
        return new GrandLivreEdit(this.mouvementsByCompte).edit(editter, option);
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        // yield* this.mouvementsByCompte;
        for (const { key: compte, balanceData } of this.mouvementsByCompte) {
            yield { compte, balanceData };
        }
    }
}
