import { keys } from '@upradata/util';
import { Compte, CompteParentAux } from '@accounting';

type ToCsvTypes<T> = {
    [ K in keyof T ]: T[ K ] extends boolean ? string | boolean :
    T[ K ] extends number ? string | number :
    string
};


export interface ComptaDepensePiece {
    id: string;
    journal: string;
    compte: Compte;
    compteAux: Compte;
    debit: number;
    credit: number;
}

export type ComptaDepensePieceCSV = ToCsvTypes<ComptaDepensePiece> & { compteLibelle: string; };

class ComptaDepenseTypeHelper {
    'frais-generaux';
    'loyer';
    'compte-courant';
    'greffe';
    'vente-website';
}


export type ComptaDepenseType = keyof ComptaDepenseTypeHelper;
export const comptaDepenseTypes = keys(new ComptaDepenseTypeHelper());

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

export type ComptaDepenseCSV = ToCsvTypes<ComptaDepense>;


export interface ComptaSaisieMouvement {
    id: string;
    libelle: string;
    journal: string;
    date: Date;
    compte: Compte;
    compteAux?: Compte;
    debit: number;
    credit: number;
    isImported: boolean;
    compteInfo: CompteParentAux;
}


export type ComptaSaisieMouvementCSV = ToCsvTypes<Omit<ComptaSaisieMouvement, 'compteInfo'>> & { compteLibelle: string; };


export interface ComptaCompte {
    id: string;
    numero: number;
    libelle: string;
}

export type ComptaCompteCSV = ToCsvTypes<ComptaCompte>;


export interface ComptaJournal {
    code: string;
    libelle: string;
    type: string;
    compteContrepartie: Compte;
    compteTresorerie?: Compte;
}

export type ComptaJournalCSV = ToCsvTypes<ComptaJournal>;


export interface ComptaPlanComptable {
    id: string;
    numero: number;
    libelle: string;
}

export type ComptaPlanComptableCSV = ToCsvTypes<ComptaPlanComptable>;


export class ComptaDataFactory<CSV extends boolean = true> {
    depenses: CSV extends true ? ComptaDepenseCSV : ComptaDepense;
    depensesPieces: CSV extends true ? ComptaDepensePieceCSV : ComptaDepensePiece;
    saisiePieces: CSV extends true ? ComptaSaisieMouvementCSV : ComptaSaisieMouvement;
    journaux: CSV extends true ? ComptaJournalCSV : ComptaJournal;
    planComptable: CSV extends true ? ComptaPlanComptableCSV : ComptaPlanComptable;
    balanceReouverture: CSV extends true ? ComptaSaisieMouvementCSV : ComptaSaisieMouvement;
}


export type ComptaDataNames = keyof ComptaDataFactory;

export type ComptaDataCSV = {
    [ K in keyof ComptaDataFactory ]: Array<ComptaDataFactory<true>[ K ]>
};

export type ComptaData = {
    [ K in keyof ComptaDataFactory ]: Array<ComptaDataFactory<false>[ K ]>
};


export type ComptaDataMap<T> = Record<keyof ComptaDataFactory, T>;
