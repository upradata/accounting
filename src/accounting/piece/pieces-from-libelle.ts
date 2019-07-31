import { Piece } from './piece';
import { PieceFactory } from './piece-factory';
import { Compte, CompteInfo } from '../compte';

export class FromLibelle {

}
export interface Depense {
    libelle: string;
    date: Date;
    ttc: number;
    ht: number;
    tva: number;
}

export type PieceFromLibelleGenerator = (depense: Depense) => Piece[];

export class PieceFromLibelle {

    constructor(private generators: PieceFromLibelleGenerator[] = []) { }

    add(generator: PieceFromLibelleGenerator) {
        this.generators.push((generator));
    }

    generate(depense: Depense): Piece[] {
        for (const generator of this.generators) {
            const pieces = generator(depense);
            if (pieces) return pieces;
        }

        return [];
    }
}


const generators = {} as { [ k: string ]: PieceFromLibelleGenerator };

generators.loyerGenerator = (depense: Depense): Piece[] => {
    if (/(SDM|Loyer)/i.test(depense.libelle)) {
        // 60 Opérations Diverses
        // 6132: Locations immobilieres (compte de charges)
        // 4011: Fournisseurs SDM (compte fournisseur)
        const crediteur = new CompteInfo({ compte: 401, compteAux: 4011 });

        return [
            PieceFactory.achat({ crediteur, debiteur: { compte: new Compte(6132) }, ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }
};



generators.fraisGenerauxGenerator = (depense: Depense): Piece[] => {
    if (/frais generaux/i.test(depense.libelle)) {
        // 60 Opérations Diverses
        // 6064: Fournitures administratives (compte de charges)
        // 4012: Fournisseur Frais Généraux (compte fournisseur)
        const crediteur = new CompteInfo({ compte: 401, compteAux: 4012 });

        return [
            PieceFactory.achat({ crediteur, debiteur: new CompteInfo({ compte: 6064 }), ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }
};


generators.greffeGenerator = (depense: Depense): Piece[] => {
    if (/greffe|inpi|bodacc|kbis/i.test(depense.libelle)) {
        // 60 Opérations Diverses
        // 6227: Frais d'actes et de contentieux (compte de charges)
        // 4013: Frais Greffe (compte fournisseur)
        const crediteur = new CompteInfo({ compte: 401, compteAux: 4013 });

        return [
            PieceFactory.achat({ crediteur, debiteur: new CompteInfo({ compte: 6227 }), ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }
};


generators.compteCourantGenerator = (depense: Depense): Piece[] => {
    if (/compte courant/i.test(depense.libelle)) {
        // 4551 Associés - Comptes courants : Principal
        // 45511 Compte courant associé Thomas Milotti
        // 77881 Produit exceptionel Abandon Compte Thomas Milottti

        return [
            PieceFactory.banque({ montant: depense.ttc, compteInfo: new CompteInfo({ compte: 4551, compteAux: 45511 }), type: 'vente', ...depense }),
            new Piece({ journal: '90', ...depense }).addMouvementPartieDouble({
                montant: depense.ttc, crediteur: new CompteInfo({ compte: 77881 }), debiteur: new CompteInfo({ compte: 4551, compteAux: 45511 })
            })
        ];
    }
};


generators.venteWebsite = (depense: Depense): Piece[] => {
    if (/vente/i.test(depense.libelle) && /website/i.test(depense.libelle)) {
        // 60 Opérations Diverses
        // 707: Vente de marchandise TVA1 (compte de produits) (70701 exonéré de TVA)
        // 4111: Compte Client Website (compte client)
        const debiteur = new CompteInfo({ compte: 4111 });

        return [
            PieceFactory.achat({ crediteur: new CompteInfo({ compte: 707 }), debiteur, ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: debiteur, type: 'vente', ...depense })
        ];
    }
};



export const PREDIFINED_GENERATORS: PieceFromLibelleGenerator[] = Object.values(generators);
