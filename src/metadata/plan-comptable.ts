import { RootService, AppInjector } from '@upradata/dependency-injection';

export type CompteOption = string | number | Compte;

export class Compte {
    numero: string;
    libelle: string;


    // planComptable has? just to put libelle before. But it exists always
    constructor(numero: string | number, libelle?: string) {
        const planComptable = AppInjector.root.get(PlanComptable);

        this.numero = Compte.pad(numero);
        this.libelle = libelle || planComptable.getFromNumero(this.numero).libelle;
    }

    static pad(s: string | number, padding = '0') {
        return s ? `${s}`.padEnd(7, padding) : '';
    }


    static create(compte: CompteOption) {
        if (compte instanceof Compte)
            return compte;

        return compte ? new Compte(compte) : undefined;
    }

    /* get [ Symbol.toStringTag ]() {
        return this.numero;
    } */
}


export interface CompteParentAuxOption {
    compte: CompteOption;
    compteAux?: CompteOption;
}


export class CompteParentAux {
    compte: Compte;
    compteAux?: Compte;

    constructor(option: CompteParentAuxOption) {
        this.compte = Compte.create(option.compte);
        this.compteAux = Compte.create(option.compteAux);
    }
}



@RootService()
export class PlanComptable {
    public plan: Compte[] = [];

    constructor() { }

    add(...comptes: { numero: number; libelle: string; }[]) {
        for (const { numero, libelle } of comptes)
            this.plan.push(new Compte(numero, libelle));
    }

    getFromNumero(numero: string) {
        return this.plan.find(c => c.numero === numero);
    }

    getFromLibelle(libelle: string) {
        return this.plan.find(c => c.libelle === libelle);
    }
}
