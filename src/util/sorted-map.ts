
import { SortedMap as SortedMapCollection } from 'collections/sorted-map';
import { ObjectOf } from '@upradata/util';

export interface SortedMap<K, V> {
    get(key: K): V;
    set(key: K, value: V): void;
    iterate(): Iterator<{ key: K, value: V; }>;
    [ Symbol.iterator ](): IterableIterator<{ key: K, value: V; }>;
    toArray(): V[];

    toObject(): ObjectOf<{ key: K, value: V; }>;
}

export interface SortedMapConstructor {
    new <K, V>(entries?: [ K, V ][], equals?: (keyLeft: K, keyRight: K) => boolean, compare?: (keyLeft: K, keyRight: K) => number, getDefault?: (k: K) => V): SortedMap<K, V>;
}


SortedMapCollection.prototype[ Symbol.iterator ] = function () { return this.iterate(); };
export const SortedMap = SortedMapCollection as SortedMapConstructor;
