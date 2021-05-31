import { Compte } from '@accounting';

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
