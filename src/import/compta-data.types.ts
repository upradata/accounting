import { TupleValues } from '@upradata/util';
import { Compte, CompteParentAux } from '@metadata/plan-comptable';

/* type ToCsvTypes<T> = {
    [ K in keyof T ]: T[ K ] extends boolean ? string | boolean :
    T[ K ] extends number ? string | number :
    string
};
 */

export interface ComptaEcritureSimplePiece {
    id: string;
    journal: string;
    debit: number;
    credit: number;
    compteInfo: CompteParentAux;
    ref?: ComptaEcritureComptaGeneratorRef;
}

export type ComptaEcritureSimplePieceCSV = /* ToCsvTypes< */Omit<ComptaEcritureSimplePiece, 'compteInfo'>/* > */ & {
    compte: Compte;
    compteLibelle: string;
    compteAux?: Compte;
    compteAuxLibelle?: string;
};


export const comptaEcritureSimpleTypes = [
    'frais-generaux',
    'loyer',
    'compte-courant',
    'greffe',
    'vente-website',
    'affectation-resultat-benefice',
    'affectation-resultat-perte',
    'remboursement-tva'
] as const;


export type ComptaEcritureSimpleType = TupleValues<typeof comptaEcritureSimpleTypes>;

export interface EcritureSimpleData {
    libelle: string;
    ttc: number;
    ht?: number;
    tva?: number;
    date: Date;
    journal?: string;
    isImported: boolean;
}

export type ComptaEcritureSimple = EcritureSimpleData & {
    id: string;
    type: ComptaEcritureSimpleType;
    creditMouvement?: string;
    debitMouvement?: string;
    pieceRef?: string;
};

export type ComptaEcritureSimpleCSV = /* ToCsvTypes< */ComptaEcritureSimple/* > */;


export interface ComptaSaisieMouvement {
    id: string;
    libelle: string;
    journal: string;
    date: Date;
    debit: number;
    credit: number;
    isImported: boolean;
    compteInfo: CompteParentAux;
    ref?: ComptaEcritureComptaGeneratorRef;
}


export type ComptaSaisieMouvementCSV = /* ToCsvTypes< */Omit<ComptaSaisieMouvement, 'compteInfo'>/* > */ & {
    compte: Compte;
    compteLibelle: string;
    compteAux?: Compte;
    compteAuxLibelle?: string;
};


export const comptacritureComptaGeneratorTypes = [
    'helper',
    'ecriture-simple',
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


export interface ComptaEcritureComptaGenerator<Expression = string> {
    function: { functionName: string; argNames: (string | string[])[]; }; // f(a, { b, c }) => argNames: [ 'a', [ 'b', 'c' ] ]
    type: ComptacritureComptaGeneratorTypes;
    journal?: string | Expression;
    condition?: boolean | Expression;
    compte?: Compte | Expression;
    compteAux?: Compte | Expression;
    debit?: number | Expression;
    credit?: number | Expression;
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
    ecritureSimples: CSV extends true ? ComptaEcritureSimpleCSV : ComptaEcritureSimple;
    ecritureSimplePieces: CSV extends true ? ComptaEcritureSimplePieceCSV : ComptaEcritureSimplePiece;
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
