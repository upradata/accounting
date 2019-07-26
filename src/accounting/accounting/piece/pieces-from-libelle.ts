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
        // 6132: Locations immobilieres
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
        // 6132: Fournitures administratives
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
        // 6132: Fournitures administratives & 4013: Frais Greffe
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


export const PREDIFINED_GENERATORS: PieceFromLibelleGenerator[] = Object.values(generators);
