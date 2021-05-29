import fs from 'fs-extra';
import path from 'path';
import Ajv from 'ajv';
import { entries, isDefined, ObjectOf } from '@upradata/util';
import { logger } from '@util';

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



export class Run {
    private accounting: AccountingInterface;
    private metadataSchema: { path: string; schema: ObjectOf<any>; };
    private metadata: ComptabiliteMetadata;

    constructor(public options: ProgramArguments) {
        const metadataSchemaPath = path.join(__dirname, './metadata/accounting-metadata.schema.json');
        this.metadataSchema = {
            path: metadataSchemaPath,
            schema: require(metadataSchemaPath)
        };
    }


    async loadMetadata(): Promise<ComptabiliteMetadata> {
        const metadataFile = this.options.metadata || path.join(__dirname, '../metadata.json');
        const metadataJson = await fs.readFile(metadataFile, { encoding: 'utf8' });
        const metadata = JSON.parse(metadataJson) as ComptabiliteMetadataOption<string>;

        const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
        const validate = ajv.compile(this.metadataSchema.schema);
        const valid = validate(metadata);

        if (!valid) {
            const message = validate.errors.map(e => {
                const params = entries(e.params).map(([ k, v ]) => `${k} -> ${v}`).join(', ');
                return `${e.instancePath} \n${params}: ${e.message}`;
            });


            throw new Error(
                `${metadataFile} is not respecting the following schema "${this.metadataSchema.path}":
                 ${message}`
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

        try {
            await this.init();

            const { dataDirectory, inputOds, inputCsv, fec, edit } = this.options;

            await this.accounting.importComptaData({
                directory: dataDirectory,
                odsFilename: inputOds,
                files: inputCsv
            });

            this.accounting.processLettrage();

            const promises: Promise<any>[] = [];

            if (fec)
                promises.push(this.generateFec());

            if (edit)
                promises.push(this.edit());

            return Promise.all(promises);

        } catch (e) {
            logger.error(e.message);
            logger.error(e);
        }
    }

    generateFec(): Promise<any> {
        const { fec, fecOnlyNonImported, outputDir } = this.options;
        return this.accounting.generateFec({ separator: ';', onlyNonImported: fecOnlyNonImported, outputFilename: typeof fec === 'string' ? fec : undefined, outputDir });
    }

    edit(): Promise<any> {
        const promises: Promise<any>[] = [];
        const { outputDir } = this.options;

        // let messageConsole = '';

        const write = (filename: string, data: string) => fs.writeFile(filename, data, { encoding: 'utf8' })
            .then(() => /* messageConsole += colors.blue.bold.$ */logger.info(`${filename} generated`));


        const editter = (filename: string) => {
            const loggers: EditterLoggers = {};

            for (const type of this.options.editType) {
                switch (type) {
                    case 'console': loggers.console = [ s => Promise.resolve(console.log(s)) ]; break;
                    case 'csv': loggers.csv = [ s => write(path.join(outputDir, `${filename}.csv`), s) ]; break;
                    case 'json': loggers.json = [ s => write(path.join(outputDir, `${filename}.json`), s) ]; break;
                    default: if (promises.length === 0) /* messageConsole += yellow */logger.error(`Logger "${type}" non implemented`);
                }
            }

            return new Editter({ loggers });
        };

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


        return Promise.all(promises); // .then(() => logger.info(messageConsole));
    }

}
