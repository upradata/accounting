import path from 'path';
import fs from 'fs-extra';
import { odsToXlsx, xlsxToCsv, createTmpDir } from '@upradata/node-util';
import { PartialRecursive, assignRecursive, filter, map, keys, RequiredProps, entries } from '@upradata/util';
import { logger } from '@util';
import { ImporterFiles, ImporterOptionInput, ImporterFile, INPUT_DATA_DEFAULTS as defaults } from './importer-input';


export class ImporterOption<T = string> {
    files: ImporterFiles<T> = {} as any;
    odsFilename?: string;
    directory: string;


    constructor(private option: PartialRecursive<ImporterOptionInput<ImporterFile>>) {
        this.directory = option.directory || '.';
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

        const files = await fs.readdir(this.directory);

        const defaultFiles = map(defaults.files, (_k, importer) => ({ filename: path.basename(importer.filename) }));
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


        const files = map(inputFiles, (key, file) => {
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
        const { odsFilename } = this.option;
        const tmpDir = await createTmpDir.async({ prefix: '@mt-accounting-' });

        const files = await this.getFiles();

        const xlsxFile = odsFilename ? await odsToXlsx(this.dir(this.odsFilename), { outputDir: tmpDir }) : undefined;

        await Promise.all(entries(files).map(async ([ key, file ]) => {
            const { sheetName, filename, required } = file;

            if (sheetName) {
                await xlsxToCsv(xlsxFile, { sheetName, outputDir: tmpDir })
                    .then(csvOutput => this.fileLoaded(key, csvOutput))
                    .catch(e => {
                        if (e.stderr && new RegExp(`Sheet.*${sheetName}.*not found`).test(e.stderr as string) && !required) {
                            logger.warn((e.stderr as string).trim());
                        } else {
                            logger.error(`Could not load sheet ${sheetName} in ${this.dir(this.odsFilename)} due to following error:`);
                            logger.error(e);
                            logger.warn(`Try load file ${this.dir(filename)}`);
                        }
                    });

            } else {
                this.fileLoaded(key, this.dir(filename));
            }
        }));

        const notLoaded = this.requiredFilesNotLoaded();

        if (notLoaded.length > 0)
            throw new Error(`Could not load: ${notLoaded.join(',')}`);

    }

    private requiredFilesNotLoaded() {
        return keys(this.getRequiredFiles()).filter(requiredFile => !this.files[ requiredFile ]);
    }

    private fileLoaded(name: string, filepath: string) {
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
}
