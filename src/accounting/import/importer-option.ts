
import * as  fs from 'fs';
import * as path from 'path';
import { assignDefaultOption } from '../../../linked-modules/@mt/browser-util/assign';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { PartialRecursive } from '../util/types';
import { odsToXlsx, xlsxToCsv } from '../util/csv-util';

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
    depensesPieces?: T = undefined;
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
        depensesPieces: { sheetName: 'DepensePieces'/* , filename: 'comptes.csv'  */ },
        saisiePieces: { sheetName: 'SaisiePieces'/* , filename: 'journaux.csv' */ },
        planComptable: { sheetName: 'PlanComptable'/* , filename: 'plan-comptable.csv' */ }, // mandatory
        journaux: { sheetName: 'Journaux'/* , filename: 'journaux.csv' */ }, // mandatory
        balanceReouverture: { sheetName: 'BalanceReouverture'/* , filename: 'reouverture.csv'  */ }
    };

    constructor(private option: PartialRecursive<ImporterOption<ImporterFile>>) {
        const filenames = [ ...Object.values(option.files || []).map(f => f.filename), option.odsFilename ];
        const hasOneFileRelative = this.isOneFileRelativePath(filenames);

        // is not hasOneFileRelative => option.files[key].filename are names if present
        this.directory = option.directory || (hasOneFileRelative ? '.' : path.join(__dirname, '../../../data/'));
        this.odsFilename = option.odsFilename;
    }

    private isOneFileRelativePath(files: string[]) {
        for (const file of files) {
            if (file && file.includes('/'))
                return true;
        }

        return false;
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
