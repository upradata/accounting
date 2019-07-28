export function fecDateToDate(d: string) {
    const year = parseFloat(d.slice(0, 4));
    const month = parseFloat(d.slice(4, 6)) - 2; // // strange behavior in Node. should be -1
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
