import { ObjectOf } from './util/types';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import { promisify } from 'util';
import { ComptabiliteMetadata, ComptabiliteMetadataOption } from './metadata/accounting-metadata';
import { Injector } from './util/di';
import { Editter } from './edition/editter';
import { GrandLivre } from './accounting/grand-livre/grand-livre';
import { BalanceDesComptes } from './accounting/balance-comptes/balance-des-comptes';
import { JournalCentraliseur } from './accounting/journal-centraliseur/journal-centraliseur';
import { PlanComptable } from './metadata/plan-comptable';
import { Journaux } from './metadata/journaux';
import { Pieces } from './accounting/piece/pieces';
import { programArgs } from './program-args';
import { AccountingInterface } from './accounting/accounting.inteface';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);


class Run {
    private accounting: AccountingInterface;
    private metadataSchema: { path: string; schema: ObjectOf<any> };
    private metadata: ComptabiliteMetadata;

    constructor() {
        const metadataSchemaPath = path.join(__dirname, './metadata/accounting-metadata.schema.json');
        this.metadataSchema = {
            path: metadataSchemaPath,
            schema: require(metadataSchemaPath)
        };
    }


    async loadMetadata(): Promise<ComptabiliteMetadata> {
        const metadataFile = programArgs.metadata || 'metadata.json';
        const metadataJson = await readFileAsync(metadataFile, { encoding: 'utf8' });
        const metadata = JSON.parse(metadataJson) as ComptabiliteMetadataOption<string>;

        const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
        const validate = ajv.compile(this.metadataSchema.schema);
        const valid = validate(metadata);

        if (!valid) {
            throw new Error(
                `${metadataFile} is not respecting the following schema: ${this.metadataSchema.path}: ${validate.errors.map(e =>
                    e.dataPath + ' ' +
                    Object.entries(e.params).map(([ k, v ]) => `${k} -> ${v}`).join(', ') + ': ' + e.message)}`
            );
        }

        const start = programArgs.exerciseStart;
        const startDate = new Date(parseFloat(start.slice(4, 8)), parseFloat(start.slice(2, 4)), parseFloat(start.slice(0, 2)));

        return new ComptabiliteMetadata({ ...metadata, exercisePeriod: { start: startDate, periodMonth: parseFloat(metadata.exercisePeriod) } });
    }

    async init() {
        this.metadata = await this.loadMetadata();

        const grandLivre = new GrandLivre();
        const services = {
            grandLivre: { provide: GrandLivre, useValue: grandLivre },
            balanceDesComptes: {
                provide: BalanceDesComptes, useFactory: (grandLivre: GrandLivre) => new BalanceDesComptes(grandLivre), deps: [ GrandLivre ]
            },
            journalCentraliseur: {
                provide: JournalCentraliseur, useFactory: (grandLivre: GrandLivre) => new JournalCentraliseur(grandLivre), deps: [ GrandLivre ]
            }
            /* { provide: JournalCentraliseur, useValue: new JournalCentraliseur(grandLivre) } */
        };


        Injector.init({
            providers: [
                {
                    provide: ComptabiliteMetadata,
                    useValue: this.metadata
                },
                //  ...Object.values(services)
            ],
            bootstrap: [ GrandLivre, BalanceDesComptes, JournalCentraliseur, PlanComptable, Journaux, Pieces ]
        });

        const { Accounting } = require('./accounting/accounting');
        this.accounting = Injector.app.get(Accounting);
    }

    async run() {
        await this.init();

        await this.accounting.importComptaData({
            directory: __dirname,
            odsFilename: programArgs.ods
        });

        this.accounting.processLettrage();

        const promises: Promise<any>[] = [];

        const fec = programArgs.fec;
        if (fec)
            promises.push(this.generateFec(fec));


        const edit = programArgs.edit;
        if (edit)
            promises.push(this.edit(edit));


        return Promise.all(promises);
    }

    generateFec(outputFec: string | boolean): Promise<any> {
        const output = typeof outputFec === 'string' ? outputFec : '';
        const outputFilename = /\.\w+$/.test(output) ? output : undefined;
        const outputDir = outputFilename ? '' : output;

        return this.accounting.generateFec({ separator: ';', outputFilename, outputDir });
    }

    edit(outputDir: string | boolean): Promise<any> {
        const promises: Promise<any>[] = [];
        const dir = typeof outputDir === 'string' ? outputDir : '';

        let messageConsole = '';

        const write = (filename: string, data: string) => writeFileAsync(filename, data, { encoding: 'utf8' })
            .then(() => messageConsole += `${filename} generated` + '\n');


        const editter = (filename: string) => new Editter({
            loggers: {
                console: [ s => Promise.resolve(console.log(s)) ],
                csv: [ s => write(path.join(dir, `${filename}.csv`), s) ],
                json: [ s => write(path.join(dir, `${filename}.json`), s) ],
            }
        });

        const option = { short: programArgs.editShort };

        promises.push(this.accounting.grandLivre.mouvementsCompte.edit(editter('grand-livre'), option));
        promises.push(this.accounting.balanceDesComptes.edit(editter('balance-comptes'), option));
        promises.push(this.accounting.journalCentraliseur.edit(editter('journal-centraliseur'), option));

        return Promise.all(promises).then(() => console.log(messageConsole));
    }

}


new Run().run();
