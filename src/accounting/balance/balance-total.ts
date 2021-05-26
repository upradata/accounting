import { numberFixedDecimal } from '@util';
import { Mouvement } from '../mouvement';


export interface BalanceTotalData {
    credit: number;
    debit: number;
    diff: number;
}


export class BalanceTotal {
    credit: number = 0;
    debit: number = 0;

    constructor() { }

    add(...mouvements: Mouvement[]) {
        for (const mouvement of mouvements) {
            if (mouvement.type === 'credit')
                this.credit += mouvement.montant;
            else
                this.debit += mouvement.montant;
        }
    }

    get diff() {
        return this.credit - this.debit;
    }

    get data(): BalanceTotalData {
        return {
            credit: numberFixedDecimal(this.credit, 2),
            debit: numberFixedDecimal(this.debit, 2),
            diff: numberFixedDecimal(this.diff, 2)
        };
    }
}
