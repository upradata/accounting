import { InjectDep } from '../../util/di';
import { GrandLivre } from '../grand-livre/grand-livre';
import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { JournalCentraliseurEdit } from './journal-centraliseur.edit';
import { JournauxBalanceByMonth } from './types';
import { JournauxBalance } from './journaux-balance';


export class JournalCentraliseur {
    public mouvementsByJournal: JournauxBalanceByMonth = [];


    constructor(@InjectDep(GrandLivre) grandLivre: GrandLivre) {
        /*  this.journauxByDate = new SortedArray(
             undefined,
             (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
             (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
         ); // ordered by date
  */
        grandLivre.onNewMouvement(mouvements => this.add(...mouvements));
    }

    getJournauxBalanceOfMonth(dateOrMonthIndex: Date | number): JournauxBalance {
        const monthIndex = dateOrMonthIndex instanceof Date ? dateOrMonthIndex.getMonth() : dateOrMonthIndex;

        let journauxBalance = this.mouvementsByJournal[ monthIndex ];

        if (!journauxBalance)
            this.mouvementsByJournal[ monthIndex ] = journauxBalance = new JournauxBalance();

        return journauxBalance;
        /*  return this.mouvementsByJournal[ dateOrMonthIndex instanceof Date ? dateOrMonthIndex.getMonth() : dateOrMonthIndex ] ||
             new SortedMap(undefined, undefined, undefined,
                 // getDefault()
                 (k: JournalId) => new SortedArray(
                     undefined,
                     (m1: Mouvement, m2: Mouvement) => m1.date === m2.date,
                     (m1: Mouvement, m2: Mouvement) => m1.date.getTime() - m2.date.getTime()
                 ) // ordered by date 
             ); */
    }


    add(...mouvements: Mouvement[]) {
        for (const mouvement of mouvements) {
            const journauxBalance = this.getJournauxBalanceOfMonth(mouvement.date); // .get(mouvement.journal);
            journauxBalance.add(mouvement);
            //  this.mouvementsByJournal[ mouvement.date.getMonth() ].set(mouvement.journal, mouvementsMonth);
        }

    }

    edit(editter: Editter): Promise<void[]> {
        return new JournalCentraliseurEdit(this.mouvementsByJournal).edit(editter);
    }

    // tslint:disable-next-line: function-name
    /* *[ Symbol.iterator ]() {
        // yield* this.mouvementsByCompte;
        for (const journauxBalance of this.mouvementsByJournal) {
            for (const { key: journal, balanceData } of journauxBalance) {
                yield { journal, balanceData };
            }
        }
    } */
}
