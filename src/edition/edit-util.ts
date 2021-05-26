import { yellow, green, red } from '@upradata/node-util';
import { formattedNumber } from '@util';


export interface CreditDebit<T = number> {
    credit: T;
    debit: T;
}


export function coloryfyDiff(diff: number, symbols: Partial<CreditDebit<string> & { zero: string; }> = {}) {
    const { credit = 'C', debit = 'D', zero = 'N' } = symbols;

    if (Math.abs(diff) < 0.01)
        return yellow`0.00 ${zero}`;

    const d = formattedNumber((diff > 0 ? diff : -diff)); // .toFixed(2);
    return diff > 0 ? green`${d} ${credit}` : red`${d} ${debit}`;
}
