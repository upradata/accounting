import { csvToJson } from '../util/csv-util';
import { ComptaDepense, ComptaJournal, ComptaCompte, ComptaDepensePiece, ComptaSaisieMouvement } from './compta-data';
import { commaToNumber } from '../util/util';
import { fecDateToDate } from '../util/compta-util';
import { Compte, CompteInfo } from '../accounting/compte';
import { Journaux } from '../metadata/journaux';

import { PartialRecursive } from '../util/types';
import { Injector } from '../util/di';
import { PlanComptable } from '../metadata/plan-comptable';
import { ImporterOption } from './importer-option';
import { ImporterFiles, ImporterFile } from './importer-input';
import { colors } from '@upradata/node-util';



export class Importer {
    private filenames: ImporterFiles<string>;

    constructor(private option: PartialRecursive<ImporterOption<ImporterFile>> = {}) { }

    async init() {
        const importerOption = new ImporterOption(this.option);
        await importerOption.init();

        this.filenames = {} as any;

        for (const [ k, filename ] of Object.entries(importerOption.files))
            this.filenames[ k ] = filename;
    }

    async importAll() {
        if (!this.filenames)
            await this.init();

        const hasBeenLoaded = <T>(name: keyof ImporterFiles, data: T): T => {
            console.log(colors.magenta.bold.$`file for ${name} has been loaded: ${this.filenames[ name ]}`);
            return data;
        };

        const planComptable = await this.planComptable().then(data => hasBeenLoaded('planComptable', data));
        Injector.app.get(PlanComptable).add(...planComptable);

        const journaux = await this.journaux().then(data => hasBeenLoaded('journaux', data));
        Injector.app.get(Journaux).add(...journaux);

        const [ depenses, depensePieces, saisies, balanceReouverture ] = await Promise.all([
            this.depenses().then(data => hasBeenLoaded('depenses', data)),
            this.depensePieces().then(data => hasBeenLoaded('depensesPieces', data)),
            this.saisies(this.filenames.saisiePieces).then(data => hasBeenLoaded('saisiePieces', data)),
            this.balanceReouverture().then(data => hasBeenLoaded('balanceReouverture', data))
        ]);

        console.log(); // jump 1 line for clarity
        return { depenses, depensePieces, saisies, balanceReouverture };
    }

    async depenses(): Promise<ComptaDepense<number, Date, boolean>[]> {
        if (!this.filenames.depenses)
            return [];

        const depenses = await csvToJson(this.filenames.depenses, {
            delimiter: ';',
            headers: [ 'id', 'libelle', 'ttc', 'ht', 'tva', 'date', 'journal', 'debit', 'credit', 'pieceRef', 'isImported' ],
            onlyHeaderColumn: true
        }) as ComptaDepense<string, string>[];


        return depenses.map(e => ({
            ...e,
            ttc: commaToNumber(e.ttc),
            ht: commaToNumber(e.ht),
            tva: commaToNumber(e.tva),
            date: fecDateToDate(e.date),
            isImported: e.isImported.toString().toLowerCase() === 'true'

        }));
    }

    async depensePieces(): Promise<ComptaDepensePiece<number, Compte>[]> {
        if (!this.filenames.depensesPieces)
            return [];

        const pieces = await csvToJson(this.filenames.depensesPieces, {
            delimiter: ';',
            headers: [ 'id', 'journal', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit' ],
            onlyHeaderColumn: true
        }) as ComptaDepensePiece<string, string>[];


        return pieces.map(e => {
            const mouvement = {
                ...e,
                compte: Compte.create(e.compte),
                compteAux: Compte.create(e.compteAux),
                compteInfo: undefined,
                credit: commaToNumber(e.credit),
                debit: commaToNumber(e.debit)
            };

            mouvement.compteInfo = new CompteInfo({ compte: mouvement.compte, compteAux: mouvement.compteAux });

            return mouvement;
        });
    }

    // | { compteInfo: CompteInfo }
    async saisies(filename: string): Promise<ComptaSaisieMouvement<number, Date, Compte, boolean>[]> {
        if (!filename)
            return [];

        const saisiePieces = await csvToJson(filename, {
            delimiter: ';',
            headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit', 'isImported' ],
            onlyHeaderColumn: true
        }) as ComptaSaisieMouvement[];


        return saisiePieces.map(e => {
            const saisie = {
                ...e,
                compte: Compte.create(e.compte),
                compteAux: Compte.create(e.compteAux),
                compteInfo: undefined,
                date: fecDateToDate(e.date),
                credit: commaToNumber(e.credit),
                debit: commaToNumber(e.debit),
                isImported: e.isImported.toString().toLowerCase() === 'true'
            };

            // saisie.compteInfo = new CompteInfo({ compte: saisie.compte, compteAux: saisie.compteAux });

            return saisie;
        });
    }

    // | { compteInfo: CompteInfo }
    async balanceReouverture(): Promise<ComptaSaisieMouvement<number, Date, Compte>[]> {
        return this.saisies(this.filenames.balanceReouverture);
    }

    async planComptable(): Promise<ComptaCompte<number>[]> {
        const comptes = await csvToJson(this.filenames.planComptable, {
            delimiter: ';', headers: [ 'id', 'numero', 'libelle' ], onlyHeaderColumn: true
        }) as ComptaCompte[];

        return comptes.map(e => ({
            ...e,
            numero: commaToNumber(e.numero)
        }));
    }

    async journaux(): Promise<ComptaJournal<Compte>[]> {

        const journaux = await csvToJson(this.filenames.journaux, {
            delimiter: ';',
            headers: [ 'code', 'libelle', 'type', 'compteContrepartie', 'compteTresorerie' ],
            onlyHeaderColumn: true
        }) as ComptaJournal[];

        return journaux.map(e => ({
            ...e,
            compteContrepartie: Compte.create(e.compteContrepartie),
            compteTresorerie: Compte.create(e.compteTresorerie)
        }));
    }
}
