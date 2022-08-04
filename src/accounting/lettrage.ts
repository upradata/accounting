import { ObjectOf } from '@upradata/util';
import { mapBy, TODAY } from '@util';
import { Mouvement } from './mouvement';


interface ByCompte {
    [ k: string ]: Mouvement[];
}

export class LettrageProcessor {
    private fournisseursByCompte: ByCompte;
    private clientsByCompte: ByCompte;
    static index: ObjectOf<{ i: number; letter: number; }> = {};

    constructor(mouvements: Mouvement[]) {
        this.fournisseursByCompte = mapBy(mouvements, 'compteInfo.compte.numero', {
            filter: m => /^401/.test(m.compteInfo.compte.numero) && m.journal.toLowerCase() !== 'xou' && !/(report|reouverture)/i.test(m.libelle)
        });
        this.clientsByCompte = mapBy(mouvements, 'compteInfo.compte.numero', {
            filter: m => /^411/.test(m.compteInfo.compte.numero) && m.journal.toLowerCase() !== 'xou' && !/(report|reouverture)/i.test(m.libelle)
        });
    }

    private nextLetter(l: string) {

        const { index } = LettrageProcessor;

        index[ l ] = index[ l ] || { i: -1, letter: 0 };

        let { i, letter } = index[ l ];
        i = i === -1 || i > 10000 ? 0 : i + 1;

        if (i === 0)
            ++letter;

        index[ l ] = { i, letter };

        return l.repeat(letter) + i;
    }


    public process(): Mouvement[] {
        const mouvementsNonLettrable: Mouvement[] = [];

        for (const { byCompte, /* type, */ letter } of [
            { byCompte: this.fournisseursByCompte, type: 'fournisseur', letter: 'C' }, // credit banque
            { byCompte: this.clientsByCompte, type: 'client', letter: 'D' } // debit banque
        ]) {
            for (const mouvementsInCompte of Object.values(byCompte)) {

                const mouvementsByType = mapBy(mouvementsInCompte, 'type') as { credit: Mouvement[]; debit: Mouvement[]; };

                if (mouvementsByType.credit) {
                    for (const mouvementC of mouvementsByType.credit) {
                        // *100 because montant can have cents => x100 for int comparaison
                        const index = mouvementsByType.debit.findIndex(m => m.montant * 100 === mouvementC.montant * 100);
                        if (index === -1) continue;

                        // lettrage
                        const mouvementD = mouvementsByType.debit[ index ];
                        // eslint-disable-next-line no-multi-assign
                        mouvementC.lettrage = mouvementD.lettrage = { letter: this.nextLetter(letter), date: TODAY.date };

                        mouvementsByType.debit.splice(index, 1); // delete (they might be few same montant)
                    }
                }

                const nonLettrables = mouvementsInCompte.filter(m => !m.lettrage);
                mouvementsNonLettrable.push(...nonLettrables);
            }
        }

        return mouvementsNonLettrable.length > 0 ? mouvementsNonLettrable : undefined;
    }

}
