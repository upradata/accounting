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

export type VenteOption = AchatOption;

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

    static achat(option: AchatOption) {
        const { ttc, ht, tva, libelle, date, journal, crediteur, debiteur } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date });

        // compte fournisseur
        piece.addMouvement({ montant: ttc, type: 'credit', compteInfo: crediteur });
        if (tva) {
            // 4456611: TVA déductible Achats Taux 1/Factures
            piece.addMouvement({ montant: tva, type: 'debit', compteInfo: new CompteInfo({ compte: 4456611 }) });
            // compte de charges
            piece.addMouvement({ montant: ht, type: 'debit', compteInfo: debiteur });
        } else
            piece.addMouvement({ montant: ttc, type: 'debit', compteInfo: debiteur });


        if (piece.tryClose())
            return piece;
    }


    static vente(option: VenteOption) {
        const { ttc, ht, tva, libelle, date, journal, crediteur, debiteur } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date });

        // compte client
        piece.addMouvement({ montant: ttc, type: 'debit', compteInfo: debiteur });
        if (tva) {
            // 445711: TVA collectée Ventes Taux 1/Factures
            piece.addMouvement({ montant: tva, type: 'credit', compteInfo: new CompteInfo({ compte: 445711 }) });
            // compte de produit
            piece.addMouvement({ montant: ht, type: 'credit', compteInfo: crediteur });
        } else
            piece.addMouvement({ montant: ttc, type: 'credit', compteInfo: crediteur });


        if (piece.tryClose())
            return piece;
    }

    static banque(option: BanqueOption) {
        const { libelle, date, montant, journal, type, compteInfo } = Object.assign(new BanqueOption(), option);

        const piece = new Piece({ journal, libelle, date });

        /* ECRITURE JOURNAL BANQUE: credit compte banque 512 - et - débit compte charge 6*** */
        piece.addMouvement({ montant, type: type === 'achat' ? 'credit' : 'debit', compteInfo: new CompteInfo({ compte: 512 }) });
        piece.addMouvement({ montant, type: type === 'achat' ? 'debit' : 'credit', compteInfo });

        if (piece.tryClose())
            return piece;
    }

}
