import { csvToJson, odsToXlsx, xlsxToCsv } from '../util/csv-util';
import { ComptaDepense, ComptaJournal, ComptaCompte, ComptaDepensePiece, ComptaSaisieMouvement } from './compta-data';
import { commaToNumber } from '../util/util';
import { fecDateToDate } from '../util/compta-util';
import { Compte, CompteInfo } from '../accounting/compte';
import { Journaux } from '../metadata/journaux';

import { PartialRecursive } from '../util/types';
import { assignDefaultOption } from '../../../linked-modules/@mt/browser-util/assign';
import { tmpdir } from 'os';
import { promisify } from 'util';
import * as  fs from 'fs';
import * as path from 'path';
import { Injector } from '../util/di';
import { PlanComptable } from '../metadata/plan-comptable';

const tmpDir = tmpdir();
const makeTmpDir = promisify(fs.mkdtemp);


export interface ImporterFile {
    filename?: string;
    sheetName?: string;
}

export class ImporterFiles<T = string> {
    planComptable: T = undefined;
    journaux: T = undefined;
    depenses?: T = undefined;
    depensePieces?: T = undefined;
    saisiePieces?: T = undefined;
    balanceReouverture?: T = undefined;
}


export class ImporterOption<T = string> {
    files: ImporterFiles<T>;
    odsFilename?: string;

    directory: string;
    private requiredFiles = [ 'planComptable', 'journaux' ];

    static defaultFiles: ImporterFiles<ImporterFile> = {
        depenses: { sheetName: 'Depenses'/* , filename: 'depenses.csv' */ },
        depensePieces: { sheetName: 'DepensePieces'/* , filename: 'comptes.csv'  */ },
        saisiePieces: { sheetName: 'SaisiePieces'/* , filename: 'journaux.csv' */ },
        planComptable: { sheetName: 'PlanComptable'/* , filename: 'plan-comptable.csv' */ }, // mandatory
        journaux: { sheetName: 'Journaux'/* , filename: 'journaux.csv' */ }, // mandatory
        balanceReouverture: { sheetName: 'BalanceReouverture'/* , filename: 'reouverture.csv'  */ }
    };

    constructor(private option: PartialRecursive<ImporterOption<ImporterFile>>) {
        this.directory = option.directory || path.join(__dirname, '../../../data/');
        this.odsFilename = option.odsFilename;
    }

    async init() {
        const promises: Promise<any>[] = [];
        const tmpDir = await this.tmpdir();

        const files = assignDefaultOption(ImporterOption.defaultFiles, this.option.files) as ImporterFiles<ImporterFile>;

        let __xlsxFilename: string = undefined;
        const xlsxFilename = async () => {
            if (__xlsxFilename) return __xlsxFilename;

            __xlsxFilename = this.odsFilename ? await odsToXlsx({ filepath: this.dir(this.odsFilename), outputDir: tmpDir }) : undefined;
            return __xlsxFilename;
        };

        for (const [ key, file ] of Object.entries(files)) {
            const { sheetName, filename } = file as ImporterFile;

            if (this.odsFilename && sheetName && !filename) { // filename => higher priority
                const xlsx = await xlsxFilename();

                promises.push(
                    xlsxToCsv({ sheetName, filepath: this.dir(xlsx), outputDir: tmpDir })
                        .then(csvOutput => this.fileLoaded(key, csvOutput)));

            } else {
                if (filename)
                    this.fileLoaded(key, this.dir(filename));
            }
        }

        return Promise.all(promises).then(() => {
            const notFound: string[] = [];

            for (const requiredFile of this.requiredFiles) {
                if (!this.files[ requiredFile ])
                    notFound.push(requiredFile);
            }

            if (notFound.length > 0)
                throw new Error(`Could not load: ${notFound.join(',')}`);
        });

    }

    private fileLoaded(name: string, filepath: string) {
        if (!this.files) this.files = {} as any;

        this.files[ name ] = filepath;
        // console.log(`file for ${name} has been loaded: ${filepath}`);
    }

    private dir(p: string) {
        if (path.isAbsolute(p))
            return p;

        return path.join(this.directory, p);
    }

    private tmpdir() {
        return makeTmpDir(`${tmpDir}${path.sep}`).catch(e => {
            throw new Error(`An error occured while creating a tmp directory in ${`${tmpDir}${path.sep}`}: ${e}`);
        });
    }
}

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

        const hasBeenLoaded = (name: keyof ImporterFiles, data: any) => {
            console.log(`file for ${name} has been loaded: ${this.filenames[ name ]}`);
            return data;
        };

        const planComptable = await this.planComptable().then(data => hasBeenLoaded('planComptable', data));
        Injector.app.get(PlanComptable).add(...planComptable);

        const journaux = await this.journaux().then(data => hasBeenLoaded('journaux', data));
        Injector.app.get(Journaux).add(...journaux);

        const [ depenses, depensePieces, saisies, balanceReouverture ] = await Promise.all([
            this.depenses().then(data => hasBeenLoaded('depenses', data)),
            this.depensePieces().then(data => hasBeenLoaded('depensePieces', data)),
            this.saisies().then(data => hasBeenLoaded('saisiePieces', data)),
            this.balanceReouverture().then(data => hasBeenLoaded('balanceReouverture', data))
        ]);

        return { depenses, depensePieces, saisies, balanceReouverture };
    }

    async depenses(): Promise<ComptaDepense<number, Date>[]> {
        const depenses = await csvToJson(this.filenames.depenses, {
            delimiter: ';',
            headers: [ 'id', 'libelle', 'ttc', 'ht', 'tva', 'date', 'journal', 'debit', 'credit', 'pieceRef' ],
            onlyHeaderColumn: true
        }) as ComptaDepense<string, string>[];


        return depenses.map(e => ({
            ...e,
            ttc: commaToNumber(e.ttc),
            ht: commaToNumber(e.ht),
            tva: commaToNumber(e.tva),
            date: fecDateToDate(e.date)
        }));
    }

    async depensePieces(): Promise<ComptaDepensePiece<number, Compte>[]> {
        const pieces = await csvToJson(this.filenames.depensePieces, {
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
    async saisies(filename?: string): Promise<ComptaSaisieMouvement<number, Date, Compte>[]> {
        const saisiePieces = await csvToJson(filename || this.filenames.saisiePieces, {
            delimiter: ';',
            headers: [ 'id', 'libelle', 'journal', 'date', 'compte', 'compteLibelle', 'compteAux', 'debit', 'credit', ],
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
                debit: commaToNumber(e.debit)
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
