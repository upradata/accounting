import { BalanceMap } from '../balance/balance-map';

export type JournalKey = string; // compte numero

export class JournauxBalance extends BalanceMap<JournalKey> {

    constructor() {
        super({
            keyCompare: (l, r) => l.localeCompare(r),
            keyFromMouvement: mouvement => mouvement.journal
        });
    }
}
