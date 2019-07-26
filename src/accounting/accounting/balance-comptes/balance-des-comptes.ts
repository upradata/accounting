
import { BalanceDesComptesEdit } from './balance-comptes.edit';
import { InjectDep } from '../../util/di';
import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { GrandLivre } from '../grand-livre/grand-livre';
import { ComptesBalance } from './comptes-balance';



export class BalanceDesComptes {
    // private balanceReouverture: BalanceDesComptes;
    private comptesBalance = new ComptesBalance();


    constructor(@InjectDep(GrandLivre) grandLivre: GrandLivre) {
        grandLivre.onNewMouvement(mouvements => this.add(...mouvements));
    }


    add(...mouvements: Mouvement[]) {
        this.comptesBalance.add(mouvements);
        /* for (const mouvement of mouvements) {
            this.comptesBalance.add([ mouvement ]);
        } */
    }

    edit(editter: Editter): Promise<void[]> {
        return new BalanceDesComptesEdit(this.comptesBalance).edit(editter);
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        yield* this.comptesBalance;
    }
}
