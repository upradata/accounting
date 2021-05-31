import { cellParsers, csvToJsonWithDefaultParsers, ParsersOptions, csvHeaders as getCsvHeaders } from '@upradata/node-util';
import { dasherize, keys, filter, isDefined, isUndefined } from '@upradata/util';
import { fecDateToDate } from '@util';
import { Compte } from '@accounting';

import {
    ComptaCompte, ComptaDepense, ComptaDepensePiece, ComptaJournal, ComptaSaisieMouvement, ComptaDataFactory, ComptaDataNames, ComptaData, ComptaDepenseType, comptaDepenseTypes
} from './compta-data.types';


type CsvParsersOption = ComptaDepense & ComptaDepensePiece & ComptaSaisieMouvement & ComptaCompte & ComptaJournal & { default: string; };
type CsvParsersOptions = ParsersOptions<CsvParsersOption>;


const compteParser = (cellData: string | undefined) => isDefined(cellData) ? Compte.create(cellData) : cellData;
const typeParser = (cellData: string | undefined) => {
    if (isUndefined(cellData))
        return cellData;

    const string = cellData.toLowerCase().trim();

    // https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
    // normalize()ing to NFD Unicode normal form decomposes combined graphemes into the combination of simple ones.
    const stringWithNoAccent = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const type = dasherize(stringWithNoAccent) as ComptaDepenseType;

    return comptaDepenseTypes.some(t => t === type) ? type : undefined;
};

let ID = 0;

const defaultParsers: CsvParsersOptions = {
    id: { emptyCell: `upradata-${++ID}`, parser: cellParsers.string },
    libelle: { emptyCell: 'Saisie Comptable En Ligne', parser: cellParsers.string },
    ttc: { emptyCell: 0, parser: cellParsers.number },
    ht: { emptyCell: 0, parser: cellParsers.number },
    tva: { emptyCell: 0, parser: cellParsers.number },
    date: { emptyCell: undefined, parser: fecDateToDate },
    type: { emptyCell: undefined, parser: typeParser },
    journal: { emptyCell: '', parser: cellParsers.string },
    credit: { emptyCell: undefined, parser: cellParsers.number },
    debit: { emptyCell: undefined, parser: cellParsers.number },
    creditMouvement: { emptyCell: '', parser: cellParsers.string },
    debitMouvement: { emptyCell: '', parser: cellParsers.string },
    pieceRef: { emptyCell: undefined, parser: cellParsers.string },
    isImported: { emptyCell: undefined, parser: cellParsers.boolean },
    compte: { emptyCell: undefined, parser: compteParser },
    compteAux: { emptyCell: undefined, parser: compteParser },
    // compteInfo: undefined,
    compteContrepartie: { emptyCell: undefined, parser: compteParser },
    compteTresorerie: { emptyCell: undefined, parser: compteParser },
    default: { emptyCell: undefined, parser: cellParsers.string }
};


const csvToJson = csvToJsonWithDefaultParsers(defaultParsers);

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

export const corecomptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => v.loadFirst));
export const notComptaDataNames = keys(filter(comptaDataHeaders, (_k, v) => !v.loadFirst));



export const importJsonFromCsv = async <N extends ComptaDataNames>(file: string, name: N): Promise<ComptaData[ N ]> => {

    const delimiter = ';';

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

    return csvToJson(file, {
        headers,
        delimiter,
        includeColumns
    }).catch(e => {
        throw new Error(`An error occured while converting csv file ${file}: ${e.message}`);
    }) as any;
};
