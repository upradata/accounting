import { arrayFromIterable, getRecursive, isDefined, RecordOf, toArray } from '@upradata/util';


export class ArrayToObjOfArrayByIdOption<T> {
    key?: (value: T) => string = undefined;
    filter?: (value: T) => boolean = v => true;
    transform?: (value: T) => T = v => v;
}


export type IdKey<T> = (string | symbol) | ((m: T) => string | symbol);

export const mapBy = function <T extends {}>(array: Iterable<T>, idKey: IdKey<T>, options?: ArrayToObjOfArrayByIdOption<T>) {
    const { key, filter, transform } = Object.assign(new ArrayToObjOfArrayByIdOption<T>(), options);

    const objById = arrayFromIterable(array).reduce((o, value) => {
        const kValue = getRecursive(value, typeof idKey === 'function' ? idKey(value) : idKey) as string | symbol;
        const k = key ? key(value) : kValue as string;

        if (filter(value))
            o[ k ] = [ ...(o[ k ] || []), transform(value) ];

        return o;
    }, {} as RecordOf<T[]>);

    return objById;
};


export const numberToComma = (n: number | string) => `${n}`.replace('.', ',');
export const commaToNumber = (s: number | string) => s === '' ? undefined : parseFloat(`${s}`.replace(',', '.'));



export function objectToArray<T>(obj: T, props: (keyof T)[], options?: { onlyDefinedValues?: boolean; }) {
    const opts = Object.assign({ onlyDefinedValues: true }, options);

    return toArray(obj, {
        filter: k => props.some(p => p === k) && (!opts.onlyDefinedValues || isDefined(obj[ k ])),
        onlyValues: true
    });
}

export function isIterable<T>(obj: any): obj is Iterable<T> {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[ Symbol.iterator ] === 'function';
}
