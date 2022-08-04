import { AppInjector, RootService } from '@upradata/dependency-injection';
import { SortedArray, EventManager } from '@util';
import { Editter, EditExtraOptions } from '@edition';
import { Mouvement } from '../mouvement';
import { ComptesBalance } from '../balance-comptes/comptes-balance'; // keep full path to prevent circular dependency
import { GrandLivreEdit } from './grand-livre.edit';


@RootService()
export class GrandLivre {
    public mouvements: SortedArray<Mouvement>; // ordered on date
    public comptesBalance = new ComptesBalance();

    constructor() {
        this.mouvements = new SortedArray(
            undefined,
            (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
            (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
        ); // ordered by date

        AppInjector.root.get(EventManager).listen('new-mouvement', mouvement => this.add(mouvement));
    }


    private add(...mouvements: Mouvement[]) {
        this.mouvements.push(...mouvements);
        this.comptesBalance.add(mouvements);
        // this.newMouvement$.emit('new-mouvement', mouvements);
    }

    mouvementsOfCompte(compteNumero: string | number) {
        return this.comptesBalance.get(compteNumero);
    }

    edit(editter: Editter, option?: EditExtraOptions): Promise<void> {
        return new GrandLivreEdit(this.comptesBalance).edit(editter, option);
    }

    // eslint-disable-next-line require-yield
    *[ Symbol.iterator ]() {
        return this.mouvements.iterate();
    }
}
