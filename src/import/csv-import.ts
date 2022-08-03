import { AppInjector } from '@upradata/dependency-injection';
import {
    cellParsers,
    csvHeaders as getCsvHeaders,
    csvToJsonWithDefaultParsers,
    makeParser,
    ParsersOptions
} from '@upradata/node-util';
import { dasherize, keys, Merge } from '@upradata/util';
import { Compte } from '@accounting';
import { Journaux, PlanComptable } from '@metadata';
import { fecDateToDate, logger } from '@util';
import {
    comptacritureComptaGeneratorTypes,
    ComptaData,
    ComptaDataFactory,
    ComptaDataNames,
    ComptaDepenseType,
    comptaDepenseTypes,
    ComptaEcritureComptaGenerator,
} from './compta-data.types';



type CsvParsersOptions = {
    [ K in keyof ComptaDataFactory ]: ParsersOptions<ComptaDataFactory[ K ] & { default?: string; }>;
};

const onParserError = (message: string) => {
    logger.error(message);
    throw new Error(message);
};



const journalParser = (options: { emitError?: boolean; } = {}) => makeParser((cellData: string | undefined) => {
    const { emitError = true } = options;

    if (!cellData)
        return undefined;

    const journaux = AppInjector.root.get(Journaux);
    const journal = journaux.journaux.find(({ code, libelle }) => code === cellData || libelle === cellData);

    if (journal)
        return journal.code;

    if (emitError)
        onParserError(`Journal "${cellData}" does not exist. Please, check the "Journaux" metadata`);
});



const planComptableParser = (what: string, options: { canBeEmpty?: boolean; emitError?: boolean; } = {}) => {
    const { canBeEmpty = false, emitError = true } = options;

    return cellParsers.compose(
        !canBeEmpty && cellParsers.ensureNotEmpty({ what, onError: onParserError }),
        (cellData: string | undefined) => {
            if (canBeEmpty && !cellData)
                return undefined;

            const planComptable = AppInjector.root.get(PlanComptable);
            const compte = planComptable.plan.find(compte => compte.numero === cellData || compte.numero === Compte.pad(cellData) || compte.libelle === cellData);

            if (compte)
                return Compte.create(compte.numero);

            if (emitError)
                onParserError(`Compte "${cellData}" does not exist. Please, check the "Plan Comptable" metadata`);
        }
    );
};


const functionSignatureCall = makeParser((cellData: string | undefined) => {
    if (!cellData)
        return undefined;

    const [ , functionName, fnArgs ] = cellData.match(/(\S+)\s*\((.*)\)/);

    // for now, only one param of object
    /*  const fnArgs = args.includes('{') ? [ args ] : cellParsers.arrayString(args);

     const functionArgs = fnArgs.map(arg => {
         const a = arg.trim();

         if (a.startsWith('{')) {
             const [ , fields ] = a.match(/{(.*)}/);

             const objFields = fields.split(',').map(field => field.trim()).reduce((o, field) => {
                 const key = field.startsWith('...') ? 'dots' : 'normal';

                 return {
                     ...o,
                     [ key ]: [ ...(o[ key ] || []), field.replace('...', '') ]
                 };
             }, { normal: [] as string[], dots: [] as string[] });

             if (objFields.dots.length > 1)
                 throw new Error(`Only one 3 dots field supported in object`);

             return {
                 object: `{${objFields.normal.join(',')}}`,// .replaceAll(/([a-zA-Z-_]+?)\s*:/g, '"$1":'),
                 spread: objFields.dots[ 0 ] // only one supported
             } as ComptaEcritureComptaGeneratorRefArgsObject;
         }

         if (/^(?:[0-9]+|(?:\.?[0-9]+)|(?:[0-9]+\.[0-9]+))$/.test(a))
             return parseFloat(a);

         return a;
     }); */

    return {
        functionName, /* args: functionArgs,  */
        getArgs: (...argNames: string[]) => Function(...[ ...argNames, `return ${fnArgs}` ])
    } as ComptaEcritureComptaGenerator[ 'ref' ];
});


const functionSignatureDef = makeParser((cellData: string | undefined) => {
    if (!cellData)
        return undefined;

    const [ , functionName, args ] = cellData.match(/(\S+)\s*\((.*)\)/);

    // for now, only one param of object
    const fnArgs = args.includes('{') ? [ args ] : cellParsers.arrayString(args);

    const argNames = fnArgs.map(arg => {
        const a = arg.trim();

        if (/^[[{]/.test(a)) {
            const [ , vars ] = a.match(/{(.*)}/); // (?:\[(.*)\])|
            return vars.split(',').map(v => v.trim());
        }

        return a;
    });

    return { functionName, argNames } as ComptaEcritureComptaGenerator[ 'function' ];
});



const applyLastNonEmptyValue = <T>() => {
    let lastValue: T = undefined;

    return (value: T) => {
        if (value) {
            lastValue = value;
            return value;
        }

        return lastValue;
    };
};


type AllOptions = Merge<ComptaDataFactory[ Exclude<keyof ComptaDataFactory, 'ecritureComptaGenerators'> ]>;


const commonParsers: ParsersOptions<AllOptions & { default?: string; }> = {
    ttc: { emptyCell: 0, parser: cellParsers.number },
    ht: { emptyCell: 0, parser: cellParsers.number },
    tva: { emptyCell: 0, parser: cellParsers.number },
    date: { parser: fecDateToDate },
    credit: { parser: cellParsers.number },
    debit: { parser: cellParsers.number },
    isImported: { parser: cellParsers.boolean },
    compte: { parser: planComptableParser('compte') },
    compteAux: { parser: planComptableParser('compteAux', { canBeEmpty: true }) },
    default: { emptyCell: undefined, parser: cellParsers.string() }
};


const IDS = {
    depense: 0,
};

const defaultParsers: CsvParsersOptions = {
    depenses: {
        ...commonParsers,
        id: { emptyCell: `depense-${++IDS.depense}`, parser: cellParsers.string() },
        libelle: { emptyCell: 'Saisie Comptable En Ligne', parser: cellParsers.string() },
        type: {
            parser: cellParsers.compose((cellData: string | undefined) => {
                if (!cellData)
                    return undefined;

                const string = cellData.toLowerCase().trim();

                // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
                // normalize()ing to NFD Unicode normal form decomposes combined graphemes into the combination of simple ones.
                const stringWithNoAccent = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

                const type = dasherize(stringWithNoAccent) as ComptaDepenseType;
                return type;
            }, cellParsers.choices({ values: comptaDepenseTypes }))
        },
        creditMouvement: { emptyCell: '', parser: cellParsers.string() },
        debitMouvement: { emptyCell: '', parser: cellParsers.string() },
        pieceRef: { parser: cellParsers.string() },
        journal: { parser: journalParser() }
    },
    depensesPieces: {
        ...commonParsers,
        id: { parser: cellParsers.ensureNotEmpty({ what: 'id', onError: onParserError }) },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser()) },

    },
    saisiePieces: {
        ...commonParsers,
        libelle: { emptyCell: `Saisie Pièce`, parser: cellParsers.string() },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser()) },
    },
    balanceReouverture: {
        ...commonParsers,
        libelle: { emptyCell: `Balance Réouverture`, parser: cellParsers.string() },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser()) },
    },
    journaux: {
        code: { parser: cellParsers.ensureNotEmpty({ what: 'code', onError: onParserError }) },
        libelle: { parser: cellParsers.ensureNotEmpty({ what: 'libelle', onError: onParserError }) },
        type: { parser: cellParsers.ensureNotEmpty({ what: 'type', onError: onParserError }) },
        compteContrepartie: { parser: planComptableParser('compteContrepartie') },
        compteTresorerie: { parser: planComptableParser('compteTresorerie', { canBeEmpty: true }) },
    },
    planComptable: {
        id: { parser: cellParsers.ensureNotEmpty({ what: 'id', onError: onParserError }) },
        numero: { parser: cellParsers.ensureNotEmpty({ what: 'numero', onError: onParserError }) },
        libelle: { parser: cellParsers.ensureNotEmpty({ what: 'libelle', onError: onParserError }) },
    },
    ecritureComptaGenerators: {
        ...commonParsers,
        function: { parser: cellParsers.compose(functionSignatureDef, applyLastNonEmptyValue<string>()) },
        type: { parser: cellParsers.choices({ values: comptacritureComptaGeneratorTypes }) },
        journal: { parser: journalParser({ emitError: false }) },
        condition: {
            parser:/*  cellParsers.string()  */(cellData: string) => {
                if (cellData === '' || typeof cellData !== 'string')
                    return undefined;

                const s = cellData.trim();
                return s.replace(/^(\s*)'(.*)'(\s*)$/, '$1$2$3');
            }
        },
        credit: { parser: cellParsers.firstToSucceed(cellParsers.number, cellParsers.string()) },
        debit: { parser: cellParsers.firstToSucceed(cellParsers.number, cellParsers.string()) },
        compte: { parser: cellParsers.firstToSucceed(planComptableParser('compte', { canBeEmpty: true, emitError: false }), cellParsers.string()) },
        compteAux: { parser: cellParsers.firstToSucceed(planComptableParser('compteAux', { canBeEmpty: true, emitError: false }), cellParsers.string()) },
        ref: { parser: functionSignatureCall/*  cellParsers.compose(functionSignatureCall, applyLastNonEmptyValue<ComptaEcritureComptaGenerator[ 'ref' ]>()) */ }
    },
};


const csvToJsonFactory = <N extends ComptaDataNames>(name: N) => csvToJsonWithDefaultParsers(defaultParsers[ name ]);

type Headers = {
    [ K in ComptaDataNames ]: {
        headers: ReadonlyArray<keyof ComptaDataFactory[ K ]>;
        isMetadata?: boolean;
        isOptional?: boolean;
    }
};

export const comptaDataHeaders: Headers = {
    depenses: {
        headers: [ 'id', 'libelle', 'ttc', 'ht', 'tva', 'date', 'type', 'journal', 'debitMouvement', 'creditMouvement', 'pieceRef', 'isImported' ],
    },
    depensesPieces: {
        headers: [ 'id', 'journal', 'compte', 'compteLibelle', 'compteAux', 'compteAuxLibelle', 'debit', 'credit' ],
    },
    saisiePieces: {
        headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'compteAuxLibelle', 'debit', 'credit', 'isImported' ],
        isMetadata: false
    },
    balanceReouverture: {
        headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'compteAuxLibelle', 'debit', 'credit', 'isImported' ],
    },
    journaux: {
        headers: [ 'code', 'libelle', 'type', 'compteContrepartie', 'compteTresorerie' ],
        isMetadata: true
    },
    planComptable: {
        headers: [ 'id', 'numero', 'libelle' ],
        isMetadata: true
    },
    ecritureComptaGenerators: {
        headers: [ 'function', 'type', 'journal', 'condition', 'compte', 'compteLibelle', 'compteAux', 'compteAuxLibelle', 'debit', 'credit', 'ref' ],
        isMetadata: true,
        isOptional: true
    }
} as const;

export const comptaDataNames = keys(new ComptaDataFactory());

// export const metadataComptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => v.isMetadata));
// export const notMetadataComptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => !v.isMetadata));



export const importJsonFromCsv = async <N extends ComptaDataNames>(file: string, name: N): Promise<ComptaData[ N ]> => {
    const delimiter = ';';
    // console.log(require('fs-extra').readFileSync(file, { encoding: 'utf8' }));
    const getHeaders = async (): Promise<readonly string[]> => {
        const csvHeaders = comptaDataHeaders[ name ].headers as readonly string[];

        if (name === 'depenses') {
            // The property "type" has been added later in the Excel Sheet "Depenses".
            // So we remove "type" from the headers for previous versions
            const headers = await getCsvHeaders(file, { delimiter });
            const typeHeader: keyof ComptaDataFactory[ 'depenses' ] = 'type';

            if (!headers.some(h => h.toLowerCase().trim() === typeHeader))
                return (csvHeaders as Headers[ 'depenses' ][ 'headers' ]).filter(h => h !== typeHeader);
        }

        return csvHeaders;
    };

    const headers = await getHeaders();
    const includeColumns = new RegExp(headers.join('|'));

    const csvToJson = csvToJsonFactory(name);

    return csvToJson(file, {
        headers: headers as any,
        delimiter,
        includeColumns,
        skipEmptyRows: true
    }).catch(e => {
        throw new Error(`An error occured while converting the file ${file} to json: ${e.message}`);
    }) as any;
};
