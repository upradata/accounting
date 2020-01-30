import { ObjectOf } from './util/types';
import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import { promisify } from 'util';
import { ComptabiliteMetadata, ComptabiliteMetadataOption } from './metadata/accounting-metadata';
import { Injector } from './util/di';
import { Editter, EditterLoggers } from './edition/editter';
import { GrandLivre } from './accounting/grand-livre/grand-livre';
import { BalanceDesComptes } from './accounting/balance-comptes/balance-des-comptes';
import { JournalCentraliseur } from './accounting/journal-centraliseur/journal-centraliseur';
import { PlanComptable } from './metadata/plan-comptable';
import { Journaux } from './metadata/journaux';
import { Pieces } from './accounting/piece/pieces';
import { ProgramArguments } from './program.arguments';
import { AccountingInterface } from './accounting/accounting.inteface';
import { isDefined } from '@upradata/util';
import { green, yellow, colors } from '@upradata/node-util';


const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);


export class Run {
    private accounting: AccountingInterface;
    private metadataSchema: { path: string; schema: ObjectOf<any> };
    private metadata: ComptabiliteMetadata;

    constructor(public options: ProgramArguments<string>) {
        const metadataSchemaPath = path.join(__dirname, './metadata/accounting-metadata.schema.json');
        this.metadataSchema = {
            path: metadataSchemaPath,
            schema: require(metadataSchemaPath)
        };
    }


    async loadMetadata(): Promise<ComptabiliteMetadata> {
        const metadataFile = this.options.metadata || path.join(__dirname, '../metadata.json');
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

        const start = this.options.exerciseStart;
        const startDate = new Date(parseFloat(start.slice(4, 8)), parseFloat(start.slice(2, 4)), parseFloat(start.slice(0, 2)));

        return new ComptabiliteMetadata({ ...metadata, exercisePeriod: { start: startDate, periodMonth: parseFloat(metadata.exercisePeriod) } });
    }

    async init() {
        this.metadata = await this.loadMetadata();

        // const grandLivre = new GrandLivre();
        /* const services = {
            grandLivre: { provide: GrandLivre, useValue: grandLivre },
            balanceDesComptes: {
                provide: BalanceDesComptes, useFactory: (grandLivre: GrandLivre) => new BalanceDesComptes(grandLivre), deps: [ GrandLivre ]
            },
            journalCentraliseur: {
                provide: JournalCentraliseur, useFactory: (grandLivre: GrandLivre) => new JournalCentraliseur(grandLivre), deps: [ GrandLivre ]
            }
            // { provide: JournalCentraliseur, useValue: new JournalCentraliseur(grandLivre) }
        }; */


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

        const { Accounting } = require('./accounting/accounting'); // if we import it before Injector.init, we have cyclic dependencies
        this.accounting = Injector.app.get(Accounting);
    }

    async run() {
        await this.init();

        const { dataDirectory, ods, listCsv, fec } = this.options;

        await this.accounting.importComptaData({
            directory: dataDirectory,
            odsFilename: ods,
            files: listCsv
        });

        this.accounting.processLettrage();

        const promises: Promise<any>[] = [];

        if (isDefined(fec) && fec)
            promises.push(this.generateFec());


        const edit = this.options.edit;
        if (edit)
            promises.push(this.edit());


        return Promise.all(promises);
    }

    generateFec(): Promise<any> {
        const { fec, fecOnlyNonImported, outputDir } = this.options;
        return this.accounting.generateFec({ separator: ';', onlyNonImported: fecOnlyNonImported, outputFilename: typeof fec === 'string' ? fec : undefined, outputDir });
    }

    edit(): Promise<any> {
        const promises: Promise<any>[] = [];
        const { outputDir } = this.options;

        let messageConsole = '';

        const write = (filename: string, data: string) => writeFileAsync(filename, data, { encoding: 'utf8' })
            .then(() => messageConsole += colors.blue.bold.$`${filename} generated` + '\n');


        const editter = (filename: string) => {
            const loggers: EditterLoggers = {};

            for (const type of this.options.editType) {
                switch (type) {
                    case 'console': loggers.console = [ s => Promise.resolve(console.log(s)) ]; break;
                    case 'csv': loggers.csv = [ s => write(path.join(outputDir, `${filename}.csv`), s) ]; break;
                    case 'json': loggers.json = [ s => write(path.join(outputDir, `${filename}.json`), s) ]; break;
                    default: if (promises.length === 0) messageConsole += yellow`Logger "${type}" non implemented\n`;
                }
            }

            return new Editter({ loggers });
        }

        const option = { short: this.options.editShort };

        if (this.options.editGrandLivre)
            promises.push(this.accounting.grandLivre.edit(editter('grand-livre'), option));
        if (this.options.editBalance)
            promises.push(this.accounting.balanceDesComptes.edit(editter('balance-comptes'), option));
        if (this.options.editJournal) {
            promises.push(this.accounting.journalCentraliseur.edit(editter('journal-centraliseur'), option));
            promises.push(this.accounting.journalCentraliseur.edit(editter('journal-centraliseur-summary'), { ...option, byJournal: true }));
        }
        if (this.options.editPieces) {
            const pieceEditter = editter('pieces');
            pieceEditter.loggers.console = undefined;

            promises.push(this.accounting.pieces.edit(pieceEditter, option));
        }


        return Promise.all(promises).then(() => console.log(messageConsole));
    }

}
