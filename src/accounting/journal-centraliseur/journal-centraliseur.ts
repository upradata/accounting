import { InjectDep } from '../../util/di';
import { GrandLivre } from '../grand-livre/grand-livre';
import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { JournalCentraliseurEdit, ExtraOption } from './journal-centraliseur.edit';
import { JournauxBalanceByMonth } from './journaux-balance-by-month';
import { EditOption } from '../../edition/edit';


export class JournalCentraliseur {
    public balanceByJournal = new JournauxBalanceByMonth();


    constructor(@InjectDep(GrandLivre) grandLivre: GrandLivre) {
        grandLivre.onNewMouvement(mouvements => this.add(...mouvements));
    }

    /* getJournauxBalanceOfMonth(dateOrMonthIndex: Date | number): JournauxBalance {
        const monthIndex = dateOrMonthIndex instanceof Date ? dateOrMonthIndex.getMonth() : dateOrMonthIndex;

        let journauxBalance = this.mouvementsByJournal[ monthIndex ];

        if (!journauxBalance)
            this.mouvementsByJournal[ monthIndex ] = journauxBalance = new JournauxBalance();

        return journauxBalance;
    }
 */

    add(...mouvements: Mouvement[]) {
        this.balanceByJournal.add(mouvements);
    }

    async edit(editter: Editter, option?: EditOption & ExtraOption): Promise<void[]> {
        return new JournalCentraliseurEdit(this.balanceByJournal).edit(editter, option);
    }
}
