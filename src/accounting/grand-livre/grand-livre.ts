import { EventEmitter } from 'events';
import { SortedArray } from '@util';
import { Editter, EditOption } from '@edition';
import { Mouvement } from '../mouvement';
import { ComptesBalance } from '../balance-comptes/comptes-balance'; // keep full path to prevent circular dependency
import { GrandLivreEdit } from './grand-livre.edit';


export class GrandLivre {
    public mouvements: SortedArray<Mouvement>; // ordered on date
    public comptesBalance = new ComptesBalance();
    private newMouvement$ = new EventEmitter();

    constructor() {
        this.mouvements = new SortedArray(
            undefined,
            (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
            (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
        ); // ordered by date
    }

    onNewMouvement(callback: (mouvements: Mouvement[]) => any) {
        this.newMouvement$.addListener('newMouvement', callback);
    }

    add(...mouvements: Mouvement[]) {
        this.mouvements.push(...mouvements);
        this.comptesBalance.add(mouvements);
        this.newMouvement$.emit('newMouvement', mouvements);
    }

    mouvementsOfCompte(compteNumero: string | number) {
        return this.comptesBalance.get(compteNumero);
        // arrayToObjOfArrayById(this.mouvements.array, 'compte.numero');
    }

    edit(editter: Editter, option?: EditOption): Promise<void[]> {
        return new GrandLivreEdit(this.comptesBalance).edit(editter, option);
    }

    /* byClass() {
        return arrayToObjOfArrayById(Object.values(this.mouvements.array), 'compte', { key: e => e.compteInfo.compte.numero[ 0 ] });
    } */

    /* byDate() {
        return arrayToObjOfArrayById(Object.values(this.mouvements.array), 'date', { key: e => e.date.getMonth() + '' });
    } */

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        return this.mouvements.iterate();
    }
}
