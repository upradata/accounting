import { RecordOf, toObject, map, removeUndefined, ValueOf } from '@upradata/util';
import { Piece } from '@accounting/piece/piece';
import { ComptaEcritureComptaGenerator, ComptaEcritureComptaGeneratorRef, EcritureSimpleData } from '@import/compta-data.types';
import { logger, mapBy } from '@util';
import { CompteParentAux } from './plan-comptable';

export class EcritureComptaGenerators {
    generators: RecordOf<(...args: unknown[]) => Piece[]> = {};

    constructor(ecrituresGenerators?: ComptaEcritureComptaGenerator[]) {
        if (ecrituresGenerators)
            this.add(ecrituresGenerators);
    }

    add(ecrituresGenerators: ComptaEcritureComptaGenerator[]) {
        const generatorsById = {
            helpers: mapBy(ecrituresGenerators.filter(e => e.type === 'helper'), 'function.functionName'),
            ecrituresSimples: mapBy(ecrituresGenerators.filter(e => e.type === 'ecriture-simple'), 'function.functionName'),
        };


        type EcritureData = Omit<ComptaEcritureComptaGenerator, 'ref' | 'function' | 'type'>;
        type EcritureDataEvaluated = Omit<ComptaEcritureComptaGenerator<never>, 'ref' | 'function' | 'type'>;
        type MouvementData = Omit<EcritureDataEvaluated, 'condition'>;

        type Variable = { key: string; value: unknown; };


        const ecritureDataEvaluation = (argNames: (string | string[])[], args: unknown[]) => {
            const vars = args.flatMap((arg, i) => {
                if (typeof arg === 'object') {
                    const names = argNames[ i ];
                    return Array.isArray(names) ? names.map(n => ({ key: n, value: arg[ n ] })) : { key: names, value: arg };
                }

                return { key: argNames[ i ] as string, value: arg };
            }) as Variable[];

            const variables = {
                keys: vars.map(p => p.key),
                values: vars.map(p => p.value),
                object: map(toObject(vars, 'key'), (_, v) => v.value)
            };

            const isExpression = (expression: string) => variables.keys.some(k => expression.includes(k));

            type V = ValueOf<EcritureDataEvaluated>;
            const evaluateEcritureField = <T extends V = V>(expression: string): undefined | T => {
                // eslint-disable-next-line no-new-func
                return isExpression(expression) ? Function(...[ ...variables.keys, `return ${expression}` ])(...variables.values) : undefined;
            };

            const evaluateEcriture = (ecriture: EcritureData) => map(
                ecriture,
                (_, v) => typeof v === 'string' && isExpression(v) ? evaluateEcritureField(v) : v
            ) as EcritureDataEvaluated;


            return {
                variables,
                isExpression,
                evaluateEcritureField,
                evaluateEcriture
            };
        };

        type EcritureEval = ReturnType<typeof ecritureDataEvaluation>;

        const helpers = Object.entries(generatorsById.helpers).reduce((o, [ id, ecritures ]) => {
            return {
                ...o,
                [ id ]: (...args: unknown[]) => {
                    const ecrituresEvaluated = ecritures.reduce<{ ecritures: EcritureDataEvaluated[]; error?: Error; }>(
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        (data, { function: fn, ref, type, ...ecritureData }) => {
                            if (data.error)
                                return data;

                            const { argNames } = fn;

                            const ecritureEval = ecritureDataEvaluation(argNames, args);

                            const { condition, ...ecritureEvaluated } = ecritureEval.evaluateEcriture(ecritureData);

                            if (condition === false)
                                return data;

                            try {
                                const ecrituresEvaluated = ref ? [
                                    ...callRef(ref, ecritureEval).map(m => ({ ...m, ...ecritureEvaluated })),
                                    ecritureEvaluated
                                ] : [ ecritureEvaluated ];

                                data.ecritures.push(...ecrituresEvaluated);
                            } catch (e) {
                                return { ecritures: [], error: e };
                            }

                            return data;
                        }, { ecritures: [] });

                    if (ecrituresEvaluated.error)
                        throw ecrituresEvaluated.error;

                    return ecrituresEvaluated.ecritures;
                }
            };
        }, {} as RecordOf<(...args: unknown[]) => MouvementData[]>);


        const callRef = (ref: ComptaEcritureComptaGeneratorRef, ecritureEval: EcritureEval): EcritureDataEvaluated[] => {
            const { functionName, getArgs } = ref;

            const fn = helpers[ functionName ];

            if (!fn)
                throw new Error(`function "${functionName}" not found while building EcritureComptaGenerators`);

            return fn(getArgs(...ecritureEval.variables.keys)(...ecritureEval.variables.values));
        };



        const piecesGeneratorsById = Object.entries(generatorsById.ecrituresSimples).reduce((o, [ id, ecritures ]) => {
            return {
                ...o,
                [ id ]: (...args: unknown[]) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const pieces = ecritures.reduce((pieces, { function: fn, ref, type, ...ecritureData }) => {

                        const { argNames } = fn;

                        const ecritureEval = ecritureDataEvaluation(argNames, args);
                        const ecritureSimple = args[ 0 ] as EcritureSimpleData;

                        const ecritureEvaluated = ecritureEval.evaluateEcriture(ecritureData);

                        if (ecritureEvaluated.condition === false)
                            return pieces;

                        try {

                            const ecriture: Partial<EcritureDataEvaluated> = removeUndefined(ecritureEvaluated);
                            const ecrituresEvaluated = ref ? [ ...callRef(ref, ecritureEval).map(e => ({ ...e, ...ecriture })), ecriture ] : [ ecriture ];
                            const { journal } = ecrituresEvaluated[ 0 ];

                            if (!pieces[ journal ]) {
                                pieces[ journal ] = new Piece({
                                    journal,
                                    libelle: ecritureSimple.libelle,
                                    date: ecritureSimple.date,
                                    isImported: ecritureSimple.isImported,
                                });
                            }

                            const mouvements = ecrituresEvaluated.filter(m => Object.values(m).length > 0).map(m => ({
                                montant: m.credit || m.debit,
                                compteInfo: new CompteParentAux({ compte: m.compte, compteAux: m.compteAux }),
                                type: m.credit ? 'credit' as const : 'debit' as const
                            }));

                            pieces[ journal ].addMouvement(...mouvements);
                        } catch (e) {
                            logger.error(e);
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
