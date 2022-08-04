import { AppInjector, RootService } from '@upradata/dependency-injection';
import { EditExtraOptions, Editter } from '@edition';
import { EventManager } from '@util';
import { Mouvement } from '../mouvement';
import { BalanceDesComptesEdit } from './balance-comptes.edit';
import { ComptesBalance } from './comptes-balance';


@RootService()
export class BalanceDesComptes {
    // private balanceReouverture: BalanceDesComptes;
    private comptesBalance = new ComptesBalance();


    constructor() {
        AppInjector.root.get(EventManager).listen('new-mouvement', mouvement => this.add(mouvement));
    }


    private add(...mouvements: Mouvement[]) {
        this.comptesBalance.add(mouvements);
    }

    edit(editter: Editter, option?: EditExtraOptions): Promise<void> {
        return new BalanceDesComptesEdit(this.comptesBalance).edit(editter, option);
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        yield* this.comptesBalance;
    }
}
