import { SortedMap } from '@util';
import { JournauxBalance } from './journaux-balance';
import { Mouvement } from '../mouvement';


export interface MonthYear {
    month: number;
    year: number;
}


function compareNumbers(n1: number, n2: number): number {
    return n1 === n2 ? 0 : n1 < n2 ? -1 : 1;
}

export class JournauxBalanceByMonth {
    dateToBalance: SortedMap<MonthYear, JournauxBalance>;

    constructor() {
        this.dateToBalance = new SortedMap<MonthYear, JournauxBalance>(undefined,
            (j1, j2) => j1.month === j2.month && j1.year === j2.year,
            (j1, j2) => {
                if (j1.year === j2.year) return compareNumbers(j1.month, j2.month);
                return compareNumbers(j1.year, j2.year);
            },
            monthYear => new JournauxBalance()
        );
    }

    add(mouvements: Mouvement[]) {

        for (const mouvement of mouvements) {
            const monthYear = {
                month: mouvement.date.getMonth(),
                year: mouvement.date.getFullYear()
            };

            const balance = this.dateToBalance.get(monthYear).add(mouvements);
            this.dateToBalance.set(monthYear, balance);
        }
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ](): IterableIterator<{ monthYear: MonthYear; balance: JournauxBalance; }> {
        for (const { key: monthYear, value: balance } of this.dateToBalance)
            yield { monthYear, balance };
    }
}
