import { InjectDep } from '@util';
import { Editter, EditExtraOptions } from '@edition';
import { BalanceDesComptesEdit } from './balance-comptes.edit';
import { Mouvement } from '../mouvement';
import { GrandLivre } from '../grand-livre';
import { ComptesBalance } from './comptes-balance';



export class BalanceDesComptes {
    // private balanceReouverture: BalanceDesComptes;
    private comptesBalance = new ComptesBalance();


    constructor(@InjectDep(GrandLivre) grandLivre: GrandLivre) {
        grandLivre.onNewMouvement(mouvements => this.add(...mouvements));
    }


    add(...mouvements: Mouvement[]) {
        this.comptesBalance.add(mouvements);
    }

    edit(editter: Editter, option?: EditExtraOptions): Promise<void[]> {
        return new BalanceDesComptesEdit(this.comptesBalance).edit(editter, option);
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        yield* this.comptesBalance;
    }
}
