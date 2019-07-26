import { ComptaJournal } from '../import/compta-data';
import { Compte } from '../accounting/compte';

export class Journaux {
    public journaux: ComptaJournal<Compte>[] = [];

    constructor() { }

    add(...journaux: ComptaJournal<Compte>[]) {
        this.journaux.push(...journaux);
    }

    getFromCode(code: string) {
        return this.journaux.find(j => j.code === code);
    }
}
