import { ObjectOf } from './types';

export class ArrayToObjOfArrayByIdOption<T> {
    key?: (value: T) => string = undefined;
    filter?: (value: T) => boolean = v => true;
    transform?: (value: T) => T = v => v;
}


function getFromPath(k: string | symbol, o: ObjectOf<any>) {
    if (typeof k === 'symbol') return k;

    let v = o;

    for (const key of k.split('.'))
        v = v[ key ];

    return v;
}

export type IdKey<T> = (string | symbol) | ((m: T) => string | symbol);

export const arrayToObjOfArrayById = function <T>(array: Iterable<T>, idKey: IdKey<T>, options?: ArrayToObjOfArrayByIdOption<T>) {
    const { key, filter, transform } = Object.assign(new ArrayToObjOfArrayByIdOption<T>(), options);

    const objById = {} as { [ k: string ]: T[] };

    for (const value of array) {
        const kValue = getFromPath(typeof idKey === 'function' ? idKey(value) : idKey, value) as string | symbol;
        const k = key ? key(value) : kValue as string;
        // as string because Typescript does not allow yet to access an obj with a symbol index [s]]

        const arr = objById[ k ] || [];
        if (filter(value))
            arr.push(transform(value));

        if (arr.length > 0)
            objById[ k ] = arr;

    }

    return objById;
    /* return array.reduce((objById, value) => {
        const kValue = value[ idKey ];
        const k = key ? key(value) : kValue;

        const arr = objById[ k ] || [];
        if (filter(value))
            arr.push(transform(value));

        if (arr.length > 0)
            objById[ k ] = arr;

        return objById;
    }, {} as { [ k: string ]: T[] }); */
};


export const numberToComma = (n: number | string) => (n + '').replace('.', ',');
export const commaToNumber = (s: string) => s === '' ? undefined : parseFloat(s.replace(',', '.'));


export const firstLetterUpperCase = (s: string) => s[ 0 ].toUpperCase() + s.slice(1);


export type FlattenMergeKey = (key: string, nextKey: string) => string;
export class FlattenObjectOption {
    mergeKey?: FlattenMergeKey = (k1, k2) => k1 + firstLetterUpperCase(k2);
    nbLevels?: number = NaN;
}

export function flattenObject(obj: ObjectOf<any>, option?: FlattenObjectOption, currentLevel = 0) {
    const { mergeKey, nbLevels } = Object.assign(new FlattenObjectOption, option);

    const flatO = {};

    for (const [ k, v ] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v) && currentLevel !== nbLevels) {
            const flatten = flattenObject(v, option, currentLevel + 1);
            for (const [ flattenK, flattenV ] of Object.entries(flatten))
                flatO[ mergeKey(k, flattenK) ] = flattenV;
        } else
            flatO[ mergeKey('', k) ] = v;
    }


    return flatO;
}
