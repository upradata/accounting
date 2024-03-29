import { CompteParentAux } from '@metadata/plan-comptable';
import { Piece } from './piece';

export class AchatOption {
    libelle: string;
    ttc: number;
    ht?: number;
    tva?: number;
    date: Date;
    journal?: string = '60'; // journal Achat
    crediteur: CompteParentAux;
    debiteur: CompteParentAux;
    isImported: boolean;
}

export class VenteOption extends AchatOption {
    journal?: string = '70'; // journal Vente
};

export class BanqueOption {
    montant: number;
    libelle: string;
    date: Date;
    journal?: string = 'BQ'; // journal Banque
    compteInfo: CompteParentAux;
    type: 'achat' | 'vente';
    isImported: boolean;
}

export class PieceFactory {

    constructor() { }

    static achat(option: AchatOption) {
        const { ttc, ht, tva, libelle, date, journal, crediteur, debiteur, isImported } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date, isImported });

        // compte fournisseur
        piece.addMouvement({ montant: ttc, type: 'credit', compteInfo: crediteur });
        
        if (tva) {
            // 4456611: TVA déductible Achats Taux 1/Factures
            piece.addMouvement({ montant: tva, type: 'debit', compteInfo: new CompteParentAux({ compte: 4456611 }) });
            // compte de charges
            piece.addMouvement({ montant: ht, type: 'debit', compteInfo: debiteur });
        } else
            piece.addMouvement({ montant: ttc, type: 'debit', compteInfo: debiteur });


        if (piece.tryClose())
            return piece;
    }


    static vente(option: VenteOption) {
        const { ttc, ht, tva, libelle, date, journal, crediteur, debiteur, isImported } = Object.assign(new AchatOption(), option);

        const piece = new Piece({ journal, libelle, date, isImported });

        // compte client
        piece.addMouvement({ montant: ttc, type: 'debit', compteInfo: debiteur });

        if (tva) {
            // 445711: TVA collectée Ventes Taux 1/Factures
            piece.addMouvement({ montant: tva, type: 'credit', compteInfo: new CompteParentAux({ compte: 445711 }) });
            // compte de produit
            piece.addMouvement({ montant: ht, type: 'credit', compteInfo: crediteur });
        } else
            piece.addMouvement({ montant: ttc, type: 'credit', compteInfo: crediteur });


        if (piece.tryClose())
            return piece;
    }

    static banque(option: BanqueOption) {
        const { libelle, date, montant, journal, type, compteInfo, isImported } = Object.assign(new BanqueOption(), option);

        const piece = new Piece({ journal, libelle, date, isImported });

        /* ECRITURE JOURNAL BANQUE: credit compte banque 512 - et - débit compte charge 6*** */
        piece.addMouvement({ montant, type: type === 'achat' ? 'credit' : 'debit', compteInfo: new CompteParentAux({ compte: 512 }) });
        piece.addMouvement({ montant, type: type === 'achat' ? 'debit' : 'credit', compteInfo });

        if (piece.tryClose())
            return piece;
    }

}
