import { formattedNumber } from '@util';


export interface CreditDebit<T = number> {
    credit: T;
    debit: T;
}


export function coloryfyDiff(diff: number, symbols: Partial<CreditDebit<string> & { zero: string; zeroIsEmpty: boolean; }> = {}): { value: string; color?: string; } {
    const { credit = 'C', debit = 'D', zero = 'N', zeroIsEmpty = false } = symbols;

    if (Math.abs(diff) < 0.01)
        return zeroIsEmpty ? { value: '' } : { value: `0.00 ${zero}`, color: 'yellow' };

    const d = formattedNumber((diff > 0 ? diff : -diff)); // .toFixed(2);
    return diff > 0 ? { value: `${d} ${credit}`, color: 'green' } : { value: `${d} ${debit}`, color: 'red' };
}
