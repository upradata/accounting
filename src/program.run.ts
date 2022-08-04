import path from 'path';
import Ajv from 'ajv';
import fs from 'fs-extra';
import { AppInjector } from '@upradata/dependency-injection';
import { entries, filter, ObjectOf } from '@upradata/util';
import { Accounting } from './accounting/accounting';
import { AccountingInterface } from './accounting/accounting.interface';
import { EditterLoggers } from './edition/edit.types';
import { Editter } from './edition/editter';
import { consoleEditter } from './edition/editters/editter.console';
import { csvEditter } from './edition/editters/editter.csv';
import { jsonEditter } from './edition/editters/editter.json';
import { ComptabiliteMetadata, MetadataJson } from './metadata/accounting-metadata';
import metadataSchema from './metadata/accounting-metadata.schema.json';
import { ExercisePeriodOption } from './metadata/exercise-period';
import { ProgramArguments } from './program.arguments';
import { logger } from './util/logger';


export class Run {
    private accounting: AccountingInterface;
    private metadataSchema: { path: string; schema: ObjectOf<any>; };
    private metadata: ComptabiliteMetadata;

    constructor(public options: ProgramArguments) {
        const metadataSchemaPath = path.join(__dirname, './metadata/accounting-metadata.schema.json');

        this.metadataSchema = {
            path: metadataSchemaPath,
            schema: metadataSchema
        };
    }


    async loadMetadata(): Promise<ComptabiliteMetadata> {
        const metadataFile = this.options.metadata || path.join(__dirname, '../metadata.json');
        const metadataJson = await fs.readFile(metadataFile, { encoding: 'utf8' });
        const metadata = JSON.parse(metadataJson) as MetadataJson;

        const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
        const validate = ajv.compile(this.metadataSchema.schema);
        const valid = validate(metadata);

        if (!valid) {
            const message = validate.errors.map(e => {
                const params = entries(e.params).map(([ k, v ]) => `${k} -> ${v}`).join(', ');
                return `${e.instancePath}\n${params}: ${e.message}`;
            });


            throw new Error(
                `${metadataFile} is not respecting the following schema "${this.metadataSchema.path}":
                 ${message}`
            );
        }

        const exercisePeriod = (): ExercisePeriodOption => {
            const start = this.options.exerciseStart;
            if (!start)
                return undefined;

            return { start, periodMonth: metadata.exercise.period };
        };

        return new ComptabiliteMetadata({ ...metadata, exercisePeriod: exercisePeriod() });
    }

    async init() {
        this.metadata = await this.loadMetadata();

        AppInjector.init({
            providers: [
                {
                    provide: ComptabiliteMetadata,
                    useValue: this.metadata
                },
            ]
        });

        this.accounting = AppInjector.root.get(Accounting) as Required<Accounting>;
    }

    async run(): Promise<void> {

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

            await Promise.all(promises);

        } catch (e) {
            // logger.error(e.message);
            logger.error(e);
        }
    }

    generateFec(): Promise<any> {
        const { fec, fecOnlyNonImported, outputDir } = this.options;
        return this.accounting.generateFec({
            separator: ';',
            onlyNonImported: fecOnlyNonImported,
            outputFilename: typeof fec === 'string' ? fec : undefined,
            outputDir
        });
    }

    edit(): Promise<any> {
        const promises: Promise<any>[] = [];
        const { outputDir, jsonIndent } = this.options;

        const editter = (what: string) => {
            const loggers: EditterLoggers = {
                console: consoleEditter,
                csv: csvEditter({ what, outputDir }),
                json: jsonEditter({ what, outputDir, indent: jsonIndent }),
                html: undefined,
                pdf: undefined
            };

            return new Editter({ loggers: filter(loggers, k => this.options.editters.includes(k)) });
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
