import { Injector } from '../util/di';
import { PlanComptable } from '../metadata/plan-comptable';

export class Compte {
    numero: string;
    libelle: string;


    // planComptable has? just to put libelle before. But it exists always
    constructor(numero: string | number, libelle?: string) {
        const planComptable = Injector.app.get(PlanComptable);

        this.numero = Compte.pad(numero);
        this.libelle = libelle || planComptable.getFromNumero(this.numero).libelle;
    }

    static pad(s: string | number, padding = '0') {
        return s ? (s + '').padEnd(7, padding) : '';
    }


    static create(compte: string | number | Compte) {
        if (compte instanceof Compte)
            return compte;

        return compte ? new Compte(compte) : undefined;
    }

    /* get [ Symbol.toStringTag ]() {
        return this.numero;
    } */
}

export interface CompteInfoOption {
    compte: string | number | Compte;
    compteAux?: string | number | Compte;
}

export class CompteInfo {
    compte: Compte;
    compteAux?: Compte;

    constructor(option: CompteInfoOption) {
        this.compte = Compte.create(option.compte);
        this.compteAux = Compte.create(option.compteAux);
    }
}
