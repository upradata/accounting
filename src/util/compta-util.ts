export const fecDateToDate = (d: string) => {
    const year = parseFloat(d.slice(0, 4));
    const month = parseFloat(d.slice(4, 6)) - 1;
    const day = parseFloat(d.slice(6, 8));  // strange behavior in Node.

    return new Date(year, month, day);
};

export const dateToFecDate = (date: Date) => {

    const dd = date.getDate();
    const mm = date.getMonth() + 1; // January is 0!

    const dateDMY = { day: `${dd}`, month: `${mm}`, year: '' };

    dateDMY.year = `${date.getFullYear()}`;
    if (dd < 10) {
        dateDMY.day = `0${dd}`;
    }
    if (mm < 10) {
        dateDMY.month = `0${mm}`;
    }

    return dateDMY.year + dateDMY.month + dateDMY.day;
};


const todayDate = new Date();
export const TODAY = {
    date: todayDate,
    fecFormat: dateToFecDate(todayDate)
};


export const numberFixedDecimal = (n: number, nbDecimal: number) => parseFloat(n.toFixed(nbDecimal));


export const formattedNumber = (num: number | string, options: { zero?: string; } = {}) => {
    const { zero = `0${' '.repeat(3)}` /* 0.xx */ } = options;

    const n = +num;

    if (Number.isNaN(n))
        return '';

    if (n === 0)
        return zero;

    return new Intl.NumberFormat('fr', {
        useGrouping: true,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(n);
};


export const numberWithLeadingZeros = (n: number | string, size: number) => {
    return `${n}`.padStart(size, '0');
};
