import { RootService } from '@upradata/dependency-injection';
import { ComptaJournal } from '@import/compta-data.types';


@RootService()
export class Journaux {
    public journaux: ComptaJournal[] = [];

    constructor() { }

    add(...journaux: ComptaJournal[]) {
        this.journaux.push(...journaux);
    }

    getFromCode(code: string) {
        return this.journaux.find(j => j.code === code);
    }
}
