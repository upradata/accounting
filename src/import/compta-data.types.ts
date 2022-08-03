import { TupleValues } from '@upradata/util';
import { Compte, CompteParentAux } from '@accounting';

/* type ToCsvTypes<T> = {
    [ K in keyof T ]: T[ K ] extends boolean ? string | boolean :
    T[ K ] extends number ? string | number :
    string
};
 */

export interface ComptaDepensePiece {
    id: string;
    journal: string;
    debit: number;
    credit: number;
    compteInfo: CompteParentAux;
}

export type ComptaDepensePieceCSV = /* ToCsvTypes< */Omit<ComptaDepensePiece, 'compteInfo'>/* > */ & {
    compte: Compte;
    compteLibelle: string;
    compteAux?: Compte;
    compteAuxLibelle?: string;

};


export const comptaDepenseTypes = [
    'frais-generaux',
    'loyer',
    'compte-courant',
    'greffe',
    'vente-website',
    'attribution-resultat-benefice',
    'attribution-resultat-perte',
    'remboursement-tva'
] as const;


export type ComptaDepenseType = TupleValues<typeof comptaDepenseTypes>;


export interface ComptaDepense {
    id: string;
    libelle: string;
    ttc: number;
    ht: number;
    tva: number;
    date: Date;
    type: ComptaDepenseType;
    journal: string;
    creditMouvement: string;
    debitMouvement: string;
    pieceRef: string;
    isImported: boolean;
}

export type ComptaDepenseCSV = /* ToCsvTypes< */ComptaDepense/* > */;


export interface ComptaSaisieMouvement {
    id: string;
    libelle: string;
    journal: string;
    date: Date;
    debit: number;
    credit: number;
    isImported: boolean;
    compteInfo: CompteParentAux;
}


export type ComptaSaisieMouvementCSV = /* ToCsvTypes< */Omit<ComptaSaisieMouvement, 'compteInfo'>/* > */ & {
    compte: Compte;
    compteLibelle: string;
    compteAux?: Compte;
    compteAuxLibelle?: string;
};


export const comptacritureComptaGeneratorTypes = [
    'helper',
    'generator',
] as const;


export type ComptacritureComptaGeneratorTypes = TupleValues<typeof comptacritureComptaGeneratorTypes>;

export type ComptaEcritureComptaGeneratorRefArgsObject = { object: string; spread?: string; };
export type ComptaEcritureComptaGeneratorRef = {
    functionName: string; /* args: (string | number | ComptaEcritureComptaGeneratorRefArgsObject)[] */
    getArgs: (...argNames: string[]) => (...args: any[]) => {};
};

export const isComptaEcritureComptaGeneratorRefArgsObject = (value: any): value is ComptaEcritureComptaGeneratorRefArgsObject => {
    const v = (value as ComptaEcritureComptaGeneratorRefArgsObject);
    return v && !!v.object;
};

type Variable = string;

export interface ComptaEcritureComptaGenerator {
    function: { functionName: string; argNames: (string | string[])[]; }; // f(a, { b, c }) => argNames: [ 'a', [ 'b', 'c' ] ]
    type: ComptacritureComptaGeneratorTypes;
    journal?: string | Variable;
    condition?: boolean | Variable;
    compte?: Compte | string | Variable;
    compteAux?: Compte | string | Variable;
    debit?: number | Variable;
    credit?: number | Variable;
    ref?: ComptaEcritureComptaGeneratorRef;
}


export type ComptaEcritureComptaGeneratorsCSV = /* ToCsvTypes< */Omit<ComptaEcritureComptaGenerator, 'compteInfo'>/* > */ & {
    compteLibelle?: string;
    compteAuxLibelle?: string;
};



export interface ComptaCompte {
    id: string;
    numero: number;
    libelle: string;
}

export type ComptaCompteCSV = /* ToCsvTypes< */ComptaCompte/* > */;


export interface ComptaJournal {
    code: string;
    libelle: string;
    type: string;
    compteContrepartie: Compte;
    compteTresorerie?: Compte;
}

export type ComptaJournalCSV = /* ToCsvTypes< */ComptaJournal/* > */;


export interface ComptaPlanComptable {
    id: string;
    numero: number;
    libelle: string;
}

export type ComptaPlanComptableCSV = /* ToCsvTypes< */ComptaPlanComptable/* > */;


export class ComptaDataFactory<CSV extends boolean = true> {
    depenses: CSV extends true ? ComptaDepenseCSV : ComptaDepense;
    depensesPieces: CSV extends true ? ComptaDepensePieceCSV : ComptaDepensePiece;
    saisiePieces: CSV extends true ? ComptaSaisieMouvementCSV : ComptaSaisieMouvement;
    journaux: CSV extends true ? ComptaJournalCSV : ComptaJournal;
    planComptable: CSV extends true ? ComptaPlanComptableCSV : ComptaPlanComptable;
    balanceReouverture: CSV extends true ? ComptaSaisieMouvementCSV : ComptaSaisieMouvement;
    ecritureComptaGenerators: CSV extends true ? ComptaEcritureComptaGeneratorsCSV : ComptaEcritureComptaGenerator;
}


export type ComptaDataNames = keyof ComptaDataFactory;

export type ComptaDataCSV = {
    [ K in ComptaDataNames ]: Array<ComptaDataFactory<true>[ K ]>
};

export type ComptaData = {
    [ K in ComptaDataNames ]: Array<ComptaDataFactory<false>[ K ]>
};


export type ComptaDataMap<T> = Record<keyof ComptaDataFactory, T>;
