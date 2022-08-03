import { RecordOf, toObject, getRecursive, map, removeUndefined, keys, ValueOf } from '@upradata/util';
import { Compte, CompteParentAux, Piece } from '@accounting';
import { ComptaEcritureComptaGenerator, ComptaEcritureComptaGeneratorRef } from '@import';
import { mapBy } from '@util';
import { cp } from 'fs';


export class EcritureComptaGenerators {
    generators: RecordOf<(...args: unknown[]) => Piece[]> = {};

    constructor(ecrituresGenerators?: ComptaEcritureComptaGenerator[]) {
        if (ecrituresGenerators)
            this.add(ecrituresGenerators);
    }

    add(ecrituresGenerators: ComptaEcritureComptaGenerator[]) {
        const generatorsById = {
            helpers: mapBy(ecrituresGenerators.filter(e => e.type === 'helper'), 'function.functionName'),
            generators: mapBy(ecrituresGenerators.filter(e => e.type === 'generator'), 'function.functionName'),
        };


        type Args = Omit<ComptaEcritureComptaGenerator, 'ref' | 'function' | 'type'>;
        type Params = {
            [ K in keyof Args ]: { key: K; value: Args[ K ]; }
        };


        const getParams = (argNames: (string | string[])[], args: unknown[]) => {
            const parameters = args.flatMap((arg, i) => {
                if (typeof arg === 'object') {
                    const names = argNames[ i ];
                    return Array.isArray(names) ? names.map(n => ({ key: n, value: arg[ n ] })) : { key: names, value: arg };
                }

                return { key: argNames[ i ] as string, value: arg };
            }) as ValueOf<Params>[];

            const keys = parameters.map(p => p.key);
            const values = parameters.map(p => p.value);

            const params = map(toObject(parameters, 'key'), (_, v) => v.value);

            const isExpression = (expression: string) => keys.some(k => expression.includes(k));
            // keys.some(k => k === key.split('.')[ 0 ].replace(/^!/, ''));

            const getArgValue = <T extends ValueOf<M & { condition: boolean; }>>(key: string): undefined | T => {
                return isExpression(key) ? Function(...[ ...keys, `return ${key}` ])(...values) : undefined;
            };

            const getArgValues = (vars: Args) => map(
                vars,
                (_, v) => typeof v === 'string' && isExpression(v) ? getArgValue(v) : v
            ) as M & { condition: boolean; };


            return {
                params,
                values,
                keys,
                isVar: isExpression,
                getArgValue,
                getArgValues
            };
        };

        type P = ReturnType<typeof getParams>;

        type M = {
            journal: string; credit: number; debit: number; compte: number | Compte; compteAux: number | Compte;
        };

        const helpers = Object.entries(generatorsById.helpers).reduce((o, [ id, ecritures ]) => {
            return {
                ...o,
                [ id ]: (...args: unknown[]) => {
                    return ecritures.flatMap(({ function: fn, ref, type, ...vars }) => {

                        const { /* functionName, */ argNames } = fn;

                        const params = getParams(argNames, args);

                        const { journal, condition, credit, debit, compte, compteAux } = params.getArgValues(vars);

                        if (condition === false)
                            return undefined;


                        try {
                            const mouvement: M = { journal, compte, compteAux, credit, debit };
                            return ref ? [ ...callRef(ref, params).map(m => ({ ...m, ...mouvement })), mouvement ] : [ mouvement ];
                        } catch (e) {
                            console.error(e);
                        }

                        return undefined;
                    }).filter(v => !!v);
                }
            };
        }, {} as RecordOf<(...args: unknown[]) => M[]>);


        const callRef = (ref: ComptaEcritureComptaGeneratorRef, params: P): M[] => {
            const { functionName, getArgs } = ref;

            const fn = helpers[ functionName ];

            if (!fn)
                throw new Error(`function "${functionName}" not found while building EcritureComptaGenerators`);

            return fn(getArgs(...params.keys)(...params.values));
        };



        const piecesGeneratorsById = Object.entries(generatorsById.generators).reduce((o, [ id, ecritures ]) => {
            return {
                ...o,
                [ id ]: (...args: unknown[]) => {
                    const pieces = ecritures.reduce((pieces, { function: fn, ref, type, ...vars }) => {

                        const { /* functionName, */ argNames } = fn;

                        const params = getParams(argNames, args);
                        const depense = args[ 0 ] as { libelle: string; ttc: number; ht: number; tva: number; date: Date; isImported: boolean; journal?: string; };

                        const mm = params.getArgValues(vars);

                        if (mm.condition === false)
                            return undefined;

                        try {

                            const mouvement: Partial<M> = removeUndefined(mm);
                            const mouvements = ref ? [ ...callRef(ref, params).map(m => ({ ...m, ...mouvement })), mouvement ] : [ mouvement ];
                            const { journal } = mouvements[ 0 ];

                            if (!pieces[ journal ]) {
                                pieces[ journal ] = new Piece({
                                    journal,
                                    libelle: /* paramArgs.libelle as string */ depense.libelle, // || mouvements[ 0 ]?.libelle,
                                    date: depense.date, // getRecursive(paramArgs, 'depense.date') || params.date?.value as Date,
                                    isImported: depense.isImported,
                                });
                            }

                            pieces[ journal ].addMouvement(...mouvements.filter(m => Object.values(m).length > 0).map(m => ({
                                montant: m.credit || m.debit,
                                compteInfo: new CompteParentAux({ compte: m.compte, compteAux: m.compteAux }),
                                type: m.credit ? 'credit' as const : 'debit' as const
                            })));
                        } catch (e) {
                            console.error(e);
                        }

                        return pieces;
                    }, {} as RecordOf<Piece>);

                    const allPieces = Object.values(pieces);
                    allPieces.forEach(piece => piece.tryClose());

                    return Object.values(allPieces);
                }
            };
        }, {} as RecordOf<(...args: unknown[]) => Piece[]>);


        this.generators = {
            ...this.generators,
            ...piecesGeneratorsById
        };
    }
}
