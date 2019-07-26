import { CompteInfo } from '../compte';
import { ComptaDepense } from '../../import/compta-data';
import { Piece } from './piece';

export class AchatOption {
    libelle: string;
    ttc: number;
    ht: number;
    tva: number;
    date: Date;
    journal?: string = '60';
    crediteur: CompteInfo;
    debiteur: CompteInfo;
}

export class BanqueOption {
    montant: number;
    libelle: string;
    date: Date;
    journal?: string = 'BQ';
    compteInfo: CompteInfo;
    type: 'achat' | 'vente';
}

export class PieceFactory {

    constructor() { }

    static fromDepense(depense: ComptaDepense) {

    }

    static vente() { }

    static achat(option: AchatOption) {
        const { ttc, ht, tva, libelle, date, journal, crediteur, debiteur } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date });

        piece.addMouvement({ montant: ttc, type: 'credit', compteInfo: crediteur });
        if (tva) {
            piece.addMouvement({ montant: tva, type: 'debit', compteInfo: new CompteInfo({ compte: 4456611 }) });
            piece.addMouvement({ montant: ht, type: 'debit', compteInfo: debiteur });
        } else
            piece.addMouvement({ montant: ttc, type: 'debit', compteInfo: debiteur });

        piece.close();
        return piece;
    }

    static banque(option: BanqueOption) {
        const { libelle, date, montant, journal, type, compteInfo } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date });

        /* ECRITURE JOURNAL BANQUE: credit compte banque 512 - et - débit compte charge 6*** */
        piece.addMouvement({ montant, type: type === 'achat' ? 'credit' : 'debit', compteInfo: new CompteInfo({ compte: 512 }) });
        piece.addMouvement({ montant, type: type === 'achat' ? 'debit' : 'credit', compteInfo });

        piece.close();
        return piece;
    }

}
