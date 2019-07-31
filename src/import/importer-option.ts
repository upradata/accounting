
import * as  fs from 'fs';
import * as path from 'path';
import { assignDefaultOption, assignRecursive } from '../../linked-modules/@mt/browser-util/assign';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { PartialRecursive } from '../util/types';
import { odsToXlsx, xlsxToCsv } from '../util/csv-util';
import { ImporterFiles, ImporterOptionInput, ImporterFile, INPUT_DATA_DEFAULTS as defaults } from './importer-input';

const readdirAsync = promisify(fs.readdir);
const tmpDir = tmpdir();
const makeTmpDir = promisify(fs.mkdtemp);


export class ImporterOption<T = string> {
    files: ImporterFiles<T>;
    odsFilename?: string;
    directory: string;


    constructor(private option: PartialRecursive<ImporterOptionInput<ImporterFile>>) {
        this.directory = option.directory;
        this.odsFilename = option.odsFilename;
    }

    fileIsName(file: string) {
        // if file = test.csv => test.csv is in this.directory (data directory)
        // if file= ./test.csv => relative path

        return file && !file.includes('/');
    }

    private getRequiredFiles() {
        const requiredArray = Object.entries<ImporterFile>(defaults.files as any).filter(([ k, f ]) => f.required);
        return Object.fromEntries(requiredArray);
    }

    private isOnlyDataDirectory() {
        return this.directory && this.option === undefined;
    }

    private async getFilesInDataDirectory() {
        if (!this.directory)
            return undefined;

        const files = await readdirAsync(this.directory);

        const filepaths: Partial<ImporterFiles<ImporterFile>> = {};

        for (const file of files) {
            const [ k ] = Object.entries<ImporterFile>(defaults.files as any).find(([ k, f ]) => path.basename(f.filename) === file) || [ undefined ];
            if (k)
                filepaths[ k ] = { filename: file };
        }

        return filepaths;
    }

    async getFiles() {
        const filesInDirectory = await this.getFilesInDataDirectory();

        if (this.isOnlyDataDirectory())
            return filesInDirectory;

        const files: Partial<ImporterFiles<ImporterFile>> = {};
        const inputFiles = assignRecursive(
            this.getRequiredFiles(), filesInDirectory, this.option.files
        ) as Partial<ImporterFiles<ImporterFile>>;

        for (const [ key, file ] of Object.entries(inputFiles)) {
            const { sheetName, filename } = file as ImporterFile;

            const sheet = sheetName || !filename ? defaults.files[ key ].sheetName : undefined;
            // filename => higher priority

            if (this.option.odsFilename && sheet)
                files[ key ] = { sheetName: sheet };
            else
                files[ key ] = { filename: filename || defaults.files[ key ].filename };
        }

        return files;
    }

    async init() {
        const promises: Promise<any>[] = [];
        const tmpDir = await this.tmpdir();


        let __xlsxFilename: string = undefined;
        const xlsxFilename = async () => {
            if (__xlsxFilename) return __xlsxFilename;

            __xlsxFilename = await odsToXlsx({ filepath: this.dir(this.odsFilename), outputDir: tmpDir });
            return __xlsxFilename;
        };

        const files = await this.getFiles();

        for (const [ key, file ] of Object.entries(files)) {
            const { sheetName, filename } = file as ImporterFile;

            if (sheetName) {
                const xlsx = await xlsxFilename();

                promises.push(
                    xlsxToCsv({ sheetName, filepath: this.dir(xlsx), outputDir: tmpDir })
                        .then(csvOutput => this.fileLoaded(key, csvOutput)));

            } else
                this.fileLoaded(key, this.dir(filename));
        }


        return Promise.all(promises).then(() => this.checkRequiredFilesLoaded());
    }

    private checkRequiredFilesLoaded() {
        const notFound: string[] = [];

        for (const requiredFile of Object.keys(this.getRequiredFiles())) {
            if (!this.files[ requiredFile ])
                notFound.push(requiredFile);
        }

        if (notFound.length > 0)
            throw new Error(`Could not load: ${notFound.join(',')}`);
    }

    private fileLoaded(name: string, filepath: string) {
        if (!this.files) this.files = {} as any;

        this.files[ name ] = filepath;
        // console.log(`file for ${name} has been loaded: ${filepath}`);
    }

    private dir(p: string) {
        if (path.isAbsolute(p))
            return p;

        if (!this.fileIsName(p))
            return p;

        return path.join(this.directory, p);
    }

    private tmpdir() {
        return makeTmpDir(`${tmpDir}${path.sep}`).catch(e => {
            throw new Error(`An error occured while creating a tmp directory in ${`${tmpDir}${path.sep}`}: ${e}`);
        });
    }
}
