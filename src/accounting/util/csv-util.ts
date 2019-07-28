import { ObjectOf } from './types';

import csv from 'csvtojson';
import { CSVParseParam } from 'csvtojson/v2/Parameters';
import * as  fs from 'fs';
import * as  path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createDirIfNotExist } from './util';

const execAsync = promisify(exec);
const existAsync = promisify(fs.exists);

export function readFirstLine(filename: string) {
    return new Promise((resolve, reject) => {
        const rs = fs.createReadStream(filename, { encoding: 'utf8' });
        let acc = '';
        let pos = 0;
        let index = 0;

        rs
            .on('data', function (chunk) {
                index = chunk.indexOf('\n');
                acc += chunk;
                index !== -1 ? rs.close() : pos += chunk.length;
            })
            .on('close', function () {
                resolve(acc.slice(0, pos + index));
            })
            .on('error', function (err) {
                reject(err);
            });
    });
}

export async function csvToJson(filename: string, options: Partial<CSVParseParam> & { onlyHeaderColumn?: boolean } = {}) {
    if (options.onlyHeaderColumn)
        options.includeColumns = new RegExp(options.headers.join('|'));

    return csv(options)
        /* .subscribe((row: ObjectOf<string>) => Object.entries(row).forEach(([ k, v ]) => {
            const isNumber = /^\d+(,|\.)?\d*$/.test(v); // !isNaN(parseFloat(v));

            if (isNumber) {
                row[ k ] = parseFloat(v.replace(',', '.'));
            }
        })) */
        .fromFile(filename);
}

export function toCsv(json: ObjectOf<any>[]) {
    let header = [];

    const csvObjects = [];

    for (const row of json) {
        const headers = Object.keys(row);
        if (headers.length > header.length)
            header = headers;

        csvObjects.push(row);

    }

    let csv = header.join((';'));

    for (const o of csvObjects) {
        const row = {};

        for (const h of header)
            row[ h ] = o[ h ] || '';

        csv += '\n' + Object.values(row).join((';'));
    }

    return csv;
}


export interface SpreadSheetToCsvOption {
    filepath: string;
    sheetName: string;
    outputFile?: string;
    outputDir?: string;
}

export type XlsxToCsvOption = Omit<SpreadSheetToCsvOption, 'sheetName'>;


class SpreadSheetConvertOptionBuilder<T extends SpreadSheetToCsvOption | XlsxToCsvOption> {
    constructor(private option: T) {
        if (!option.outputDir)
            option.outputDir = '.';
    }

    async buildOption(defaultOutput: string): Promise<T> {
        const { filepath, outputDir } = this.option;

        await this.checkExist(filepath);

        const outputFile = await this.getOutputFile(defaultOutput);

        await createDirIfNotExist(outputDir);

        return Object.assign(this.option, { filepath, outputFile });
    }

    private async checkExist(filepath: string) {
        const exists = await existAsync(filepath);

        if (!exists)
            throw new Error(`${filepath} does not exist.`);
    }

    private async getOutputFile(defaultName: string): Promise<string> {
        const outputFile = this.option.outputFile || defaultName;

        await createDirIfNotExist(this.option.outputDir);

        let output: string = undefined;

        if (path.isAbsolute(outputFile))
            output = outputFile;
        else
            output = path.join(this.option.outputDir, outputFile);

        return output;
    }
}



export async function odsToXlsx(option: XlsxToCsvOption): Promise<string> {
    /* const { filepath, outputFile, outputDir = '.' } = option;

    const exists = await existAsync(filepath);

    if (!exists)
        throw new Error(`odsToXlsx failed: ${filepath} does not exist.`);

    await createDirIfNotExist(outputDir); */
    const defaultOutputFilename = path.basename(option.filepath, '.ods') + '.xlsx';
    const builder = new SpreadSheetConvertOptionBuilder<XlsxToCsvOption>(option);
    const { filepath, outputDir, outputFile } = await builder.buildOption(defaultOutputFilename);

    return execAsync(`libreoffice --headless --convert-to xlsx ${filepath} --outdir ${outputDir}`)
        .then(({ stdout, stderr }) => path.join(outputDir, path.basename(filepath, '.ods') + '.xlsx'))
        .catch(e => { throw new Error(`An error occured while converting ods file ${filepath} to xlsx: ${e}`); });
}


export async function xlsxToCsv(option: SpreadSheetToCsvOption, nbRerun: number = 0): Promise<string> {
    /* const { filepath, sheetName, outputFile, outputDir = '.' } = option;

    const outputCsv = outputFile || sheetName.toLocaleLowerCase() + '.csv';

    await createDirIfNotExist(outputDir);

    let output: string = undefined;

    if (path.isAbsolute(outputCsv))
        output = outputFile;
    else
        output = path.join(outputDir, outputCsv); */

    /* return new Promise((res, rej) => {
        // process.nextTick(() => {
        setTimeout(() => {
            execAsync(`xlsx2csv -n ${sheetName} -d ';' ${filepath} ${output}`).then(() => res(output))
                .catch(e => {
                    rej(`An error occured while exporting sheet ${sheetName} of ${filepath} to csv: ${e}`);
                });
        }, 1000);
    }); */
    const defaultOutputFilename = option.sheetName.toLocaleLowerCase() + '.csv';
    const builder = new SpreadSheetConvertOptionBuilder<SpreadSheetToCsvOption>(option);
    const { filepath, outputDir, outputFile, sheetName } = await builder.buildOption(defaultOutputFilename);

    return execAsync(`xlsx2csv -n ${sheetName} -d ';' ${filepath} ${outputFile}`).then(() => outputFile)
        .catch(e => {
            if (nbRerun < 10) // workaround: somehow we need to wait, but wait(ms) not working??
                return xlsxToCsv(option, nbRerun + 1);
            throw new Error(`An error occured while exporting sheet ${sheetName} of ${filepath} to csv: ${e}`);
        });

    /* const fileName = path.basename(filepath);
    const fileNoExt = path.basename(filepath, '.xlsx'); */

    /* try {
        const folder = await makeTmpDir(`${tmpDir}${path.sep}`);

    } catch (e) {
        console.error(`An error occured while exporting sheet ${sheetName} of ${filepath} to csv:`, e);
    } */

    /*  const tmp = path.join(__dirname, 'tmp' + Date.now());
 
     try { fs.mkdir(tmp) } catch (e) { }
 
     execSync(`cp ${file} ${tmp} && (cd ${tmp} && 
        UNOPATH=/usr/bin/libreoffice /usr/bin/python3.6 /usr/bin/unoconv -f csv -e FilterOptions="59,34,0,1" ${fileName} && cp ${fileNoExt}.csv ${process.cwd()})`);
 
     fs.rmdir(tmp); */
}

export async function odsToCsv(option: SpreadSheetToCsvOption) {
    const filepath = await odsToXlsx(option);
    return xlsxToCsv({ ...option, filepath });
}
