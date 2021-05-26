import { SortedArray } from '@util';
import { Mouvement } from '../mouvement';
import { BalanceTotal, BalanceTotalData } from './balance-total';


export class BalanceData<Total = BalanceTotal> {
    mouvements: SortedArray<Mouvement>;
    total: Total;
}

export class BalanceMapData extends BalanceData {
    constructor(args: BalanceData) {
        super();
        Object.assign(this, args);
    }

    toBalanceTotalData(): BalanceData<BalanceTotalData> {
        return {
            mouvements: this.mouvements,
            total: this.total.data
        };
    }
}
