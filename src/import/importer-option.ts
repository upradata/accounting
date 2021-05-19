
import * as  fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { odsToXlsx, xlsxToCsv } from '../util/csv-util';
import { ImporterFiles, ImporterOptionInput, ImporterFile, INPUT_DATA_DEFAULTS as defaults } from './importer-input';
import { yellow } from '@upradata/node-util';
import { PartialRecursive, assignRecursive, filter, makeObject, keys, RequiredProps } from '@upradata/util';

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

    isFileName(file: string) {
        // if file = test.csv => test.csv is in this.directory (data directory)
        // if file= path/to/test.csv => relative path to current directory

        return file && !file.includes('/');
    }

    private getRequiredFiles(): RequiredProps<ImporterFiles<ImporterFile>> {
        return filter(defaults.files, (_k, f) => f.required);
    }

    /* private isOnlyDataDirectory() {
        return this.directory && this.option === undefined;
    } */

    private async getFilesInDataDirectory() {
        if (!this.directory)
            return {};

        const files = await readdirAsync(this.directory);

        const defaultFiles = makeObject(defaults.files, (_k, importer) => ({ filename: path.basename(importer.filename) }));
        const filepaths: Partial<ImporterFiles<ImporterFile>> = filter(defaultFiles, (_k, defaultFile) => files.some(file => defaultFile.filename === file));

        return filepaths;
    }

    async getFiles() {
        const filesInDirectory = await this.getFilesInDataDirectory();

        /* if (this.isOnlyDataDirectory())
            return filesInDirectory; */

        let inputFiles = assignRecursive(filesInDirectory, this.option.files) as Partial<ImporterFiles<ImporterFile>>;

        if (Object.values(inputFiles).length === 0)
            inputFiles = defaults.files;
        else
            inputFiles = assignRecursive(this.getRequiredFiles(), inputFiles);


        const files = makeObject(inputFiles, (key, file) => {
            const { sheetName, filename } = file as ImporterFile;
            const defaultSheetName = defaults.files[ key ].sheetName;

            const sheet = sheetName || !filename ? defaultSheetName : undefined;
            // filename => higher priority (if no sheetName and filename is specified, we use it, otherwisen we use the defaultSheetName)

            if (this.option.odsFilename && sheet)
                return { sheetName: sheet, filename: filename || defaultSheetName };

            return { filename: filename || defaultSheetName };

        }) as Partial<ImporterFiles<ImporterFile>>;


        return files;
    }

    async init() {
        const promises: Promise<any>[] = [];
        const tmpDir = await this.tmpdir();

        const files = await this.getFiles();

        const needsSheet = Object.values(files).find(file => !!file.sheetName);
        let xlsx: string = undefined;

        if (needsSheet)
            xlsx = await odsToXlsx({ filepath: this.dir(this.odsFilename), outputDir: tmpDir });

        for (const [ key, file ] of Object.entries(files)) {
            const { sheetName, filename } = file as ImporterFile;

            if (sheetName) {
                promises.push(
                    xlsxToCsv({ sheetName, filepath: this.dir(xlsx), outputDir: tmpDir })
                        .then(csvOutput => this.fileLoaded(key, csvOutput))
                        .catch(e => {
                            console.warn(yellow`Could not load sheet ${sheetName} in ${this.dir(this.odsFilename)} due to following error:`);
                            console.warn(yellow`${e}`);
                            console.warn(yellow`Try load file ${this.dir(filename)}`);
                            this.fileLoaded(key, this.dir(filename));
                        })
                );

            } else
                this.fileLoaded(key, this.dir(filename));
        }


        return Promise.all(promises).then(() => {
            const notLoaded = this.requiredFilesNotLoaded();

            if (notLoaded.length > 0)
                throw new Error(`Could not load: ${notLoaded.join(',')}`);
        });
    }

    private requiredFilesNotLoaded() {
        return keys(this.getRequiredFiles()).filter(requiredFile => !this.files[ requiredFile ]);
    }

    private fileLoaded(name: string, filepath: string) {
        if (!this.files) this.files = {} as any;

        this.files[ name ] = filepath;
        // console.log(`file for ${name} has been loaded: ${filepath}`);
    }

    private dir(p: string) {
        if (path.isAbsolute(p))
            return p;

        if (!this.isFileName(p))
            return p;

        return path.join(this.directory, p);
    }

    private tmpdir() {
        return makeTmpDir(`${tmpDir}${path.sep}`).catch(e => {
            throw new Error(`An error occured while creating a tmp directory in ${`${tmpDir}${path.sep}`}: ${e}`);
        });
    }
}
