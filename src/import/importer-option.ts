import path from 'path';
import fs from 'fs-extra';
import { odsToXlsx, xlsxToCsv, createTmpDir } from '@upradata/node-util';
import { PartialRecursive, assignRecursive, filter, map, keys, RequiredProps, entries, ensureArray } from '@upradata/util';
import { logger } from '@util';
import { ImporterFiles, ImporterOptionInput, ImporterFile, INPUT_DATA_DEFAULTS as defaults } from './importer-input';


export class ImporterOption<T = string> {
    files: ImporterFiles<T> = {} as any;
    odsFilename?: string;
    directory: string;


    constructor(private option: PartialRecursive<ImporterOptionInput<ImporterFile>>) {
        this.directory = option.directory || defaults.directory;
        this.odsFilename = option.odsFilename || defaults.odsFilename;
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

        // const defaultFiles = map(defaults.files, (_, v) => ({ filename: v.filename }));
        const filesData: Partial<ImporterFiles<ImporterFile>> = filter(defaults.files, (_k, defaultFile) => files.some(file => defaultFile.filename === file));

        const odsFilename = files.includes(this.odsFilename) ?
            this.odsFilename :
            files.filter(f => path.extname(f) === '.ods').reduce<string>((f, odsFile) => {
                if (!odsFile)
                    return f;

                return odsFile === defaults.odsFilename ? odsFile : f;
            }, undefined);


        return { files: filesData, odsFilename };

        /* const filenames = Object.values(map(defaults.files, (_, v) => v.filename));
        const files = await fs.readdir(this.directory);

        return {
            files: files.filter(filename => filenames.includes(filename)),
            odsFilename: files.includes(this.odsFilename) ?
                this.odsFilename :
                files.filter(f => path.extname(f) === '.ods').reduce<string>((f, odsFile) => {
                    if (!odsFile)
                        return f;

                    return odsFile === defaults.odsFilename ? odsFile : f;
                }, undefined)
        }; */
    }

    async getFiles() {
        const { files, odsFilename } = await this.getFilesInDataDirectory();

        let inputFiles = assignRecursive(files, this.option.files) as Partial<ImporterFiles<ImporterFile>>;

        if (Object.values(inputFiles).length === 0)
            inputFiles = defaults.files;
        else
            inputFiles = assignRecursive(this.getRequiredFiles(), inputFiles);

        // const isFileInDir = !!filesInDirectory.filepaths[ filename ];

        const inputs = map(inputFiles, (key, file) => {
            const { sheetName, filename } = file;

            const defaultSheetName = defaults.files[ key ].sheetName;
            const sheet = sheetName || !filename ? ensureArray(defaultSheetName)[ 0 ] : undefined;
            // filename => higher priority (if no sheetName and filename is specified, we use it, otherwisen we use the defaultSheetName)

            if (!filename && odsFilename && sheet)
                return { ...file, sheetName: sheet /* filename : filename || defaultSheetName */ };

            return file;
            // { filename /* : filename || defaultSheetName */ };

        }) as Partial<ImporterFiles<ImporterFile>>;


        return { files: inputs, odsFilename };
    }

    async init() {
        const tmpDir = await createTmpDir.async({ prefix: '@mt-accounting-' });

        const { files, odsFilename } = await this.getFiles();

        const xlsxFile = (() => {
            let xlsx: string = undefined;

            return {
                get: async () => {
                    if (!xlsx)
                        xlsx = await odsToXlsx(this.dir(odsFilename), { outputDir: tmpDir });
                    return xlsx;
                }
            };
        })();

        await Promise.all(entries(files).map(async ([ key, file ]) => {
            const { sheetName, filename, required } = file;

            const loadSheetName = async (sheetNames: string[]) => {
                type Err = (Error | { stderr: string; });
                type ErrorData = { error: Err; sheetName: string; };

                const isStdErr = (e: Err): e is { stderr: string; } => !!(e as any).stderr;

                const load = async (i: number = 0, errors: ErrorData[] = []): Promise<{ type: 'success' | 'error'; errors?: ErrorData[]; }> => {
                    const sheetName = sheetNames[ i ];

                    return xlsxToCsv(await xlsxFile.get(), { sheetName, outputDir: tmpDir })
                        .then(csvOutput => {
                            this.fileLoaded(key, csvOutput);
                            return { type: 'success' as const };
                        })
                        .catch(e => {
                            const newErrors = [ ...errors, { error: e, sheetName } ];

                            if (e && i === sheetNames.length - 1)
                                return { type: 'error' as const, errors: newErrors };

                            return load(i + 1, newErrors);
                        });
                };

                const { type, errors } = await load();

                if (type === 'error') {
                    for (const { error: e, sheetName } of errors) {
                        if (isStdErr(e) && new RegExp(`Sheet.*${sheetName}.*not found`).test(e.stderr as string) && !required) {
                            logger.warn((e.stderr as string).trim());
                        } else {
                            logger.error(`Could not load sheet ${sheetName} in ${this.dir(this.odsFilename)} due to following error:`);
                            logger.error(new Error(isStdErr(e) ? e.stderr : e.message));
                            // logger.warn(`Try load file ${this.dir(filename)}`);
                        }
                    }
                }
            };


            if (sheetName) {
                await loadSheetName(ensureArray(sheetName));
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
