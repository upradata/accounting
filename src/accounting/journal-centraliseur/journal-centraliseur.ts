import { AppInjector, RootService } from '@upradata/dependency-injection';
import { Editter, EditExtraOptions } from '@edition';
import { EventManager } from '@util';
import { Mouvement } from '../mouvement';
import { JournalCentraliseurEdit, ExtraOption } from './journal-centraliseur.edit';
import { JournauxBalanceByMonth } from './journaux-balance-by-month';

@RootService()
export class JournalCentraliseur {
    public balanceByJournal = new JournauxBalanceByMonth();


    constructor() {
        AppInjector.root.get(EventManager).listen('new-mouvement', mouvement => this.add(mouvement));
    }

    /* getJournauxBalanceOfMonth(dateOrMonthIndex: Date | number): JournauxBalance {
        const monthIndex = dateOrMonthIndex instanceof Date ? dateOrMonthIndex.getMonth() : dateOrMonthIndex;

        let journauxBalance = this.mouvementsByJournal[ monthIndex ];

        if (!journauxBalance)
            this.mouvementsByJournal[ monthIndex ] = journauxBalance = new JournauxBalance();

        return journauxBalance;
    }
 */

    private add(...mouvements: Mouvement[]) {
        this.balanceByJournal.add(mouvements);
    }

    async edit(editter: Editter, options?: EditExtraOptions & ExtraOption): Promise<void> {
        return new JournalCentraliseurEdit(this.balanceByJournal, options).edit(editter, options);
    }
}
