import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { MouvementsCompteEdit } from './mouvements-compte.edit';
import { BalanceMap, BalanceData } from '../balance/balance-map';
import { Compte } from '../compte';
import { CompteBalance } from './compte-balance';


export class MouvementCompte {
    private mouvementsByCompte: CompteBalance;

    constructor() {
        this.mouvementsByCompte = new BalanceMap({
            keyCompare: (l, r) => l.localeCompare(r, undefined, { numeric: true }),
            keyFromMouvement: mouvement => mouvement.compteInfo.compte.numero,
            keyMutation: compteNumero => Compte.pad(compteNumero)
        });
        /*  this.mouvementsByCompte = new SortedMap(undefined, undefined,
             // numeric enables whether numeric collation should be used, such that "1" < "2" < "10".
             // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
             // compares
             (l: CompteKey, r: CompteKey) => l.localeCompare(r, undefined, { numeric: true }),
             // getDefault()
             (k: CompteKey) => new SortedArray(
                 undefined,
                 (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
                 (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
             ) // ordered by date 
         ); */
    }


    add(...mouvements: Mouvement[]) {
        /* for (const mouvement of mouvements) {
            const mouvementsCompte = this.mouvementsByCompte.get(mouvement.compteInfo.compte.numero);
            mouvementsCompte.push(mouvement);
        } */
        this.mouvementsByCompte.add(mouvements);
    }

    get(compteNumero: string | number): BalanceData {
        return this.mouvementsByCompte.getBalanceDataOfKey(compteNumero + '');
    }


    edit(editter: Editter): Promise<void[]> {
        return new MouvementsCompteEdit(this.mouvementsByCompte).edit(editter);
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        // yield* this.mouvementsByCompte;
        for (const { key: compte, balanceData } of this.mouvementsByCompte) {
            yield { compte, balanceData };
        }
    }
}
