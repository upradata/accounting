export type MouvementType = 'credit' | 'debit';

export type ObjectOf<T> = { [ k in string | number | symbol ]: T };

export type PartialRecursive<T> = {
    [ K in keyof T ]?:
    T[ K ] extends (infer U)[] ? T[ K ] :
    T[ K ] extends object ? PartialRecursive<T[ K ]> :
    T[ K ];
};
