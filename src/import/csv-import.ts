import {
    cellParsers,
    csvHeaders as getCsvHeaders,
    csvToJsonWithDefaultParsers,
    ParsersOptions
} from '@upradata/node-util';
import { Compte } from '@accounting';
import { Journaux, PlanComptable } from '@metadata';
import { dasherize, filter, keys, Merge } from '@upradata/util';
import { fecDateToDate, Injector, logger } from '@util';
import {
    ComptaData,
    ComptaDataFactory,
    ComptaDataNames,
    ComptaDepenseType,
    comptaDepenseTypes,
} from './compta-data.types';



type CsvParsersOptions = {
    [ K in keyof ComptaDataFactory ]: ParsersOptions<ComptaDataFactory[ K ] & { default?: string; }>;
};

const onParserError = (message: string) => {
    logger.error(message);
    throw new Error(message);
};

const typeParser = cellParsers.compose(
    (cellData: string | undefined) => {
        if (!cellData)
            return cellData;

        const string = cellData.toLowerCase().trim();

        // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
        // normalize()ing to NFD Unicode normal form decomposes combined graphemes into the combination of simple ones.
        const stringWithNoAccent = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const type = dasherize(stringWithNoAccent) as ComptaDepenseType;

        if (comptaDepenseTypes.includes(type))
            return type;

        onParserError(`type "${cellData}" (${type}) does not exist. Available values are [ ${comptaDepenseTypes.join(', ')} ]`);
    }
);


const journalParser = (cellData: string | undefined) => {
    if (!cellData)
        return cellData;

    const journaux = Injector.app.get(Journaux);
    const journal = journaux.journaux.find(({ code, libelle }) => code === cellData || libelle === cellData);

    if (journal)
        return journal.code;

    onParserError(`Journal "${cellData}" does not exist. Please, check the "Journaux" metadata`);
};



const planComptableParser = (what: string, options: { canBeEmpty?: boolean; } = { canBeEmpty: false }) => cellParsers.compose(
    !options?.canBeEmpty && cellParsers.ensureNotEmpty({ what, onError: onParserError }),
    (cellData: string | undefined) => {
        if (options?.canBeEmpty && !cellData)
            return cellData;

        const planComptable = Injector.app.get(PlanComptable);
        const compte = planComptable.plan.find(compte => compte.numero === cellData || compte.numero === Compte.pad(cellData) || compte.libelle === cellData);

        if (compte)
            return Compte.create(compte.numero);

        onParserError(`Compte "${cellData}" does not exist. Please, check the "Plan Comptable" metadata`);
    }
);



type AllOptions = Merge<ComptaDataFactory[ keyof ComptaDataFactory ]>;

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
    default: { emptyCell: undefined, parser: cellParsers.string }
};


const IDS = {
    depense: 0,
};

const defaultParsers: CsvParsersOptions = {
    depenses: {
        ...commonParsers,
        id: { emptyCell: `depense-${++IDS.depense}`, parser: cellParsers.string },
        libelle: { emptyCell: 'Saisie Comptable En Ligne', parser: cellParsers.string },
        type: { parser: typeParser },
        creditMouvement: { emptyCell: '', parser: cellParsers.string },
        debitMouvement: { emptyCell: '', parser: cellParsers.string },
        pieceRef: { parser: cellParsers.string },
        journal: { parser: journalParser }
    },
    depensesPieces: {
        ...commonParsers,
        id: { parser: cellParsers.ensureNotEmpty({ what: 'id', onError: onParserError }) },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser) },

    },
    saisiePieces: {
        ...commonParsers,
        libelle: { emptyCell: `Saisie Pièce`, parser: cellParsers.string },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser) },
    },
    balanceReouverture: {
        ...commonParsers,
        libelle: { emptyCell: `Balance Réouverture`, parser: cellParsers.string },
        journal: { parser: cellParsers.compose(cellParsers.ensureNotEmpty({ what: 'journal', onError: onParserError }), journalParser) },
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
    }
};


const csvToJson = (what: keyof ComptaDataFactory) => csvToJsonWithDefaultParsers(defaultParsers[ what ]);

type Headers = {
    [ K in ComptaDataNames ]: {
        headers: ReadonlyArray<keyof ComptaDataFactory[ K ]>;
        loadFirst: boolean;
    }
};

export const comptaDataHeaders: Headers = {
    depenses: {
        headers: [ 'id', 'libelle', 'ttc', 'ht', 'tva', 'date', 'type', 'journal', 'debitMouvement', 'creditMouvement', 'pieceRef', 'isImported' ],
        loadFirst: false
    },
    depensesPieces: {
        headers: [ 'id', 'journal', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit' ],
        loadFirst: false
    },
    saisiePieces: {
        headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit', 'isImported' ],
        loadFirst: false
    },
    balanceReouverture: {
        headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit', 'isImported' ],
        loadFirst: false
    },
    journaux: {
        headers: [ 'code', 'libelle', 'type', 'compteContrepartie', 'compteTresorerie' ],
        loadFirst: true
    },
    planComptable: {
        headers: [ 'id', 'numero', 'libelle' ],
        loadFirst: true
    }
} as const;

export const comptaDataNames = keys(new ComptaDataFactory());

export const metadataComptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => v.loadFirst));
export const notMetadataComptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => !v.loadFirst));



export const importJsonFromCsv = async <N extends ComptaDataNames>(file: string, name: N): Promise<ComptaData[ N ]> => {
    const delimiter = ';';
    // console.log(require('fs-extra').readFileSync(file, { encoding: 'utf8' }));
    const getHeaders = async () => {
        const csvHeaders = comptaDataHeaders[ name ].headers;

        if (name === 'depenses') {
            // The property "type" has been added later in the Excel Sheet "Depenses".
            // So we remove "type" from the headers for previous versions
            const headers = await getCsvHeaders(file, { delimiter });
            const typeHeader: keyof ComptaDataFactory[ 'depenses' ] = 'type';

            if (!headers.some(h => h.toLowerCase().trim() === typeHeader))
                return (csvHeaders as Headers[ 'depenses' ][ 'headers' ]).filter(h => h !== typeHeader) as any;
        }

        return csvHeaders;
    };

    const headers = await getHeaders();
    const includeColumns = new RegExp(headers.join('|'));

    return csvToJson(name)(file, {
        headers,
        delimiter,
        includeColumns,
        skipEmptyRows: true
    }).catch(e => {
        throw new Error(`An error occured while converting the file ${file} to json: ${e.message}`);
    }) as any;
};
