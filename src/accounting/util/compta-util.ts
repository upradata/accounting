import { ObjectOf } from './types';
import { Mouvement } from '../accounting/mouvement';


export function fecDateToDate(d: string) {
    const year = parseFloat(d.slice(0, 4));
    const month = parseFloat(d.slice(4, 6)) - 1;
    const day = parseFloat(d.slice(6, 8));  // strange behavior in Node.

    return new Date(year, month, day);
}

export function dateToFecDate(date: Date) {

    const dd = date.getDate();
    const mm = date.getMonth() + 1; // January is 0!

    const dateDMY = { day: dd + '', month: mm + '', year: '' };

    dateDMY.year = date.getFullYear() + '';
    if (dd < 10) {
        dateDMY.day = '0' + dd;
    }
    if (mm < 10) {
        dateDMY.month = '0' + mm;
    }

    return dateDMY.year + dateDMY.month + dateDMY.day;
}


const todayDate = new Date();
export const TODAY = {
    date: todayDate,
    fecFormat: dateToFecDate(todayDate)
};



export interface CreditDebit<T = number> {
    credit: T;
    debit: T;
}


export type ReduceCreditDebitCumul<T> = (cumulValue: T, currentMouvement: Mouvement) => T;

/* 
export function reduceCreditDebit<T>(
    creditDebitList: (CreditDebit & { type: MouvementType })[], cumul: ReduceCreditDebitCumul<T>, init: T): ObjectOf<CreditDebit<T>> {

    const reduceCD = { credit: init, debit: init };

    for (const mouvement of creditDebitList) {
        if (mouvement.type === 'credit')
            reduceCD.credit = cumul(reduceCD.credit, mouvement);
        else
            reduceCD.debit = cumul(reduceCD.debit, mouvement);
    }
} */

export function reduceCreditDebit<T>(
    mouvementsById: ObjectOf<Mouvement[]>, cumul: ReduceCreditDebitCumul<T>, init: T): ObjectOf<CreditDebit<T>> {

    const retObj: ObjectOf<CreditDebit<T>> = {};

    for (const [ id, mouvements ] of Object.entries(mouvementsById)) {
        const idObj = { credit: init, debit: init };

        for (const mouvement of mouvements) {
            if (mouvement.type === 'credit')
                idObj.credit = cumul(idObj.credit, mouvement);
            else
                idObj.debit = cumul(idObj.debit, mouvement);
        }

        retObj[ id ] = idObj;
    }

    return retObj;
}

export function creditDebitSum(mouvementsById: ObjectOf<Mouvement[]>): ObjectOf<CreditDebit> {
    return reduceCreditDebit(mouvementsById, (sum, mouvement) => sum + mouvement.montant, 0);
}


/* export function creditDebitDiff({ credit, debit }: CreditDebit<number | string>): number {
    const c = credit === '' ? 0 : parseFloat(credit + '');
    const d = debit === '' ? 0 : parseFloat(debit + '');

    return c - d;
} */


export function numberFixedDecimal(n: number, nbDecimal: number) {
    return parseFloat(n.toFixed(nbDecimal));
}


export function formattedNumber(num: number | string) {
    const n = parseFloat(num + '');

    if (n === 0)
        return '0   '; // 0.xx

    return new Intl.NumberFormat('fr', {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n);
}
