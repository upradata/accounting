import { InjectDep } from '../../util/di';
import { GrandLivre } from '../grand-livre/grand-livre';
import { Mouvement } from '../mouvement';
import { Editter } from '../../edition/editter';
import { JournalCentraliseurEdit } from './journal-centraliseur.edit';
import { JournauxBalanceByMonth } from './types';
import { JournauxBalance } from './journaux-balance';
import { EditOption } from '../../edition/edit';


export class JournalCentraliseur {
    public mouvementsByJournal: JournauxBalanceByMonth = [];


    constructor(@InjectDep(GrandLivre) grandLivre: GrandLivre) {
        grandLivre.onNewMouvement(mouvements => this.add(...mouvements));
    }

    getJournauxBalanceOfMonth(dateOrMonthIndex: Date | number): JournauxBalance {
        const monthIndex = dateOrMonthIndex instanceof Date ? dateOrMonthIndex.getMonth() : dateOrMonthIndex;

        let journauxBalance = this.mouvementsByJournal[ monthIndex ];

        if (!journauxBalance)
            this.mouvementsByJournal[ monthIndex ] = journauxBalance = new JournauxBalance();

        return journauxBalance;
    }


    add(...mouvements: Mouvement[]) {
        for (const mouvement of mouvements) {
            const journauxBalance = this.getJournauxBalanceOfMonth(mouvement.date);
            journauxBalance.add(mouvement);
        }

    }

    async edit(editter: Editter, option?: EditOption): Promise<void[]> {
        const journalEdit = new JournalCentraliseurEdit(this.mouvementsByJournal);

        await journalEdit.edit(editter, option);
        return journalEdit.edit(editter, { ...option, isByJournal: true });
    }
}
