import { writeFile } from 'fs';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import { SortedArray } from '../../util/sorted-array';
import { Mouvement } from '../mouvement';
// import { EditOption } from '../../edition/editter';
import { MouvementCompte } from './mouvements-compte';


const writeFilePromise = promisify(writeFile);

/* export interface EditTypes<T> {
    original: T;
    byCompte: T;
    byMonth: T;
    byClass: T;
}

export type EditOption = EditTypes<string>; */


export class GrandLivre {
    public mouvements: SortedArray<Mouvement>; // ordered on date
    public mouvementsCompte = new MouvementCompte();
    // private balance: Balance;

    // balanceDesComptes: BalanceDesComptes;
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
        // this.mouvements.push(...mouvements);
        // for (const mouvement of mouvements) {
        /*  if (mouvement.journal.toLowerCase() === 'xou')
             // Journal de réouverture
             this.balanceReouverture.add(mouvement);
         else */
        //  this.balance.add([ mouvement ]);
        // }
        this.mouvements.push(...mouvements);
        this.mouvementsCompte.add(...mouvements);
        this.newMouvement$.emit('newMouvement', mouvements);
    }

    mouvementsOfCompte(compteNumero: string | number) {
        return this.mouvementsCompte.get(compteNumero);
        // arrayToObjOfArrayById(this.mouvements.array, 'compte.numero');
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


    /* edit(filenames: EditOption) {
        const datas = Object.entries(filenames).map(([ name, filename ]) => ({
            filename, data: name === 'original' ? this.mouvements.array : this[ name ]()
        }));

        for (const { filename, data } of datas) {
            writeFilePromise(filename, JSON.stringify(data));
        }

    } */
}
