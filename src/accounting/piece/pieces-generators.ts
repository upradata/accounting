import { map } from '@upradata/util';
import { ComptaDepenseType } from '@import';
import { Compte, CompteParentAux } from '../compte';
import { Piece } from './piece';
import { PieceFactory } from './piece-factory';


export interface Depense {
    libelle: string;
    date: Date;
    ttc: number;
    ht: number;
    tva: number;
    isImported: boolean;
}

export type PieceFromLibelleGenerator = (depense: Depense) => Piece[];



export const generateFromLibelle = (generators: LibelleGenerators) => (depense: Depense): Piece[] => {
    // return the first generator able to generate the pieces
    for (const generator of Object.values(generators)) {
        const pieces = generator(depense);
        if (pieces) return pieces;
    }

    return [];
};


export const generatorFromType = (generators: Generators) => (type: ComptaDepenseType) => {
    switch (type) {
        case 'frais-generaux': return generators.fraisGeneraux;
        case 'loyer': return generators.loyer;
        case 'greffe': return generators.greffe;
        case 'compte-courant': return generators.compteCourant;
        case 'vente-website': return generators.venteWebsite;
        default: throw new Error(`Le mouvement dépense de type "${type}" n'est pas implémenté`);
    }
};


const makeGenerator = (generator: PieceFromLibelleGenerator) => generator;



export const PREDIFINED_GENERATORS = {

    loyer: makeGenerator((depense: Depense) => {
        // 60 Opérations Diverses
        // 6132: Locations immobilieres (compte de charges)
        // 4011: Fournisseurs SDM (compte fournisseur)
        const crediteur = new CompteParentAux({ compte: 401, compteAux: 4011 });

        return [
            PieceFactory.achat({ crediteur, debiteur: { compte: new Compte(6132) }, ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }),

    fraisGeneraux: makeGenerator((depense: Depense): Piece[] => {
        // 60 Opérations Diverses
        // 6064: Fournitures administratives (compte de charges)
        // 4012: Fournisseur Frais Généraux (compte fournisseur)
        const crediteur = new CompteParentAux({ compte: 401, compteAux: 4012 });

        return [
            PieceFactory.achat({ crediteur, debiteur: new CompteParentAux({ compte: 6064 }), ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }),

    greffe: makeGenerator((depense: Depense): Piece[] => {
        // 60 Opérations Diverses
        // 6227: Frais d'actes et de contentieux (compte de charges)
        // 4013: Frais Greffe (compte fournisseur)
        const crediteur = new CompteParentAux({ compte: 401, compteAux: 4013 });

        return [
            PieceFactory.achat({ crediteur, debiteur: new CompteParentAux({ compte: 6227 }), ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: crediteur, type: 'achat', ...depense })
        ];
    }),

    compteCourant: makeGenerator((depense: Depense): Piece[] => {
        // 4551 Associés - Comptes courants : Principal
        // 45511 Compte courant associé Thomas Milotti
        // 77881 Produit exceptionel Abandon Compte Thomas Milottti

        return [
            PieceFactory.banque({ montant: depense.ttc, compteInfo: new CompteParentAux({ compte: 4551, compteAux: 45511 }), type: 'vente', ...depense }),
            new Piece({ journal: '90', ...depense }).addMouvementPartieDouble({
                montant: depense.ttc, crediteur: new CompteParentAux({ compte: 77881 }), debiteur: new CompteParentAux({ compte: 4551, compteAux: 45511 })
            })
        ];
    }),

    venteWebsite: makeGenerator((depense: Depense): Piece[] => {
        // 60 Opérations Diverses
        // 707: Vente de marchandise TVA1 (compte de produits) (70701 exonéré de TVA)
        // 4111: Compte Client Website (compte client)
        const debiteur = new CompteParentAux({ compte: 4111 });

        return [
            PieceFactory.achat({ crediteur: new CompteParentAux({ compte: 707 }), debiteur, ...depense }),
            PieceFactory.banque({ montant: depense.ttc, compteInfo: debiteur, type: 'vente', ...depense })
        ];
    })
} as const;


export type Generators = typeof PREDIFINED_GENERATORS;

export type LibelleGeneratorsTest = Record<keyof Generators, (libelle: string) => boolean>;
export type LibelleGenerators = Record<keyof Generators, PieceFromLibelleGenerator>;


export const libelleRegexes: LibelleGeneratorsTest = {
    loyer: libelle => /(sdm|loyer)/i.test(libelle),
    fraisGeneraux: libelle => /frais generaux/i.test(libelle),
    greffe: libelle => /greffe|inpi|bodacc|kbis/i.test(libelle),
    compteCourant: libelle => /compte courant/i.test(libelle),
    venteWebsite: libelle => /vente/i.test(libelle) && /website/i.test(libelle)
};


export const PREDIFINED_LIBELLE_GENERATORS: LibelleGenerators = map(libelleRegexes, (k, libelleTest) => makeGenerator((depense: Depense) => {
    if (libelleTest(depense.libelle))
        return PREDIFINED_GENERATORS[ k ](depense);
}));
