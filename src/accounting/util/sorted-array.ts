
import { SortedArray as SortedArrayCollection } from 'collections/sorted-array';

export interface SortedArray<T> {
    get(index: number): T;
    push(...values: T[]): void;
    add(value: T): void;
    iterate(): Iterator<T>;
    [ Symbol.iterator ](): IterableIterator<T>;
    array: T[];
}

export interface SortedArrayConstructor {
    new <T>(values?: T[], equals?: (l: T, r: T) => boolean, compare?: (l: T, r: T) => number, getDefault?: (v: T) => T): SortedArray<T>;
}


SortedArrayCollection.prototype[ Symbol.iterator ] = function () { return this.iterate(); };
export const SortedArray = SortedArrayCollection as SortedArrayConstructor;
