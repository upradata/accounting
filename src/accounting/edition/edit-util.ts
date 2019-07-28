import { yellow, green, red } from '../util/color';
import { formattedNumber } from '../util/compta-util';


export interface CreditDebit<T = number> {
    credit: T;
    debit: T;
}


export function coloryfyDiff(diff: number | string, symbols: Partial<CreditDebit<string> & { zero: string }> = {}) {
    const { credit = 'C', debit = 'D', zero = 'N' } = symbols;
    const diffN = parseFloat(diff + '');

    if (Math.abs(diffN) < 0.01)
        return yellow`0.00 ${zero}`;

    const d = formattedNumber((diffN > 0 ? diffN : -diffN)); // .toFixed(2);
    return diff > 0 ? green`${d} ${credit}` : red`${d} ${debit}`;
}
