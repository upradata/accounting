export interface ComptaDepensePiece<numberT = string, compteT = string> {
    id: string;
    journal: string;
    compte: compteT;
    compteAux: compteT;
    debit: numberT;
    credit: numberT;
}


export interface ComptaDepense<NumberT = string, DateT = string> {
    id: string;
    libelle: string;
    ttc: NumberT;
    ht: NumberT;
    tva: NumberT;
    date: DateT;
    journal: string;
    credit: string;
    debit: string;
    pieceRef: string;
}

export interface ComptaSaisieMouvement<NumberT = string, DateT = string, CompteT = string> {
    id: string;
    libelle: string;

    journal: string;
    date: DateT;
    compte: CompteT;
    compteAux?: CompteT;
    debit: NumberT;
    credit: NumberT;
}


export interface ComptaCompte<NumberT = string> {
    id: string;
    numero: NumberT;
    libelle: string;
}

export interface ComptaJournal<CompteT = string> {
    code: string;
    libelle: string;
    type: string;
    compteContrepartie: CompteT;
    compteTresorerie?: CompteT;
}

export interface ComptaData {
    depenses: ComptaDepense[];
    pieces: ComptaDepensePiece[];
    saisiePieces: ComptaSaisieMouvement[];
    comptes: ComptaCompte[];
    journaux: ComptaJournal[];
    balanceReouverture: ComptaSaisieMouvement[];
}


// export type MapTo<Id extends string | number, T> = { [ k in Id ]: T[] };
export type MapTo<T> = { [ k: string ]: T };

export interface ComptaDataById {
    depensesById: MapTo<ComptaDepense[]>;// MapTo<string, ComptaDepense>;
    piecesById: MapTo<ComptaDepensePiece[]>;// MapTo<string, ComptaPiece>;
    saisiePiecesById: MapTo<ComptaSaisieMouvement[]>;// MapTo<string, ComptaSaisiePiece>;
    comptesByNumero: MapTo<ComptaCompte>;// MapTo<string, ComptaCompte>;
    journauxByCode: MapTo<ComptaJournal>;// MapTo<string, ComptaJournal>;
}
