import { ObjectOf } from './types';

import csv from 'csvtojson';
import { CSVParseParam } from 'csvtojson/v2/Parameters';
import * as  fs from 'fs';
import * as  path from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';
import { execSync, exec } from 'child_process';

const tmpDir = tmpdir();
const makeTmpDir = promisify(fs.mkdtemp);
const execAsync = promisify(exec);

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



export function odsToXlsx(filepath: string, outputDir: string = '.'): Promise<string> {
    return execAsync(`libreoffice --headless --convert-to xlsx ${filepath} --outdir ${outputDir}`)
        .then(({ stdout, stderr }) => path.join(outputDir, path.basename(filepath, '.ods') + '.xlsx'))
        .catch(e => { throw new Error(`An error occured while converting ods file ${filepath} to xlsx: ${e}`); });
}


export interface SpreadSheetToCsvOption {
    filepath: string;
    sheetName: string;
    outputFile?: string;
    outputDir?: string;
}


export async function xlsxToCsv(option: SpreadSheetToCsvOption, nbRerun: number = 0): Promise<string> {
    const { filepath, sheetName, outputFile, outputDir = '.' } = option;

    if (!outputFile && !outputDir)
        throw new Error('Non of outputFile and outputDir has been defined');

    const output = outputFile || path.join(outputDir, sheetName.toLocaleLowerCase() + '.csv');

    /* return new Promise((res, rej) => {
        // process.nextTick(() => {
        setTimeout(() => {
            execAsync(`xlsx2csv -n ${sheetName} -d ';' ${filepath} ${output}`).then(() => res(output))
                .catch(e => {
                    rej(`An error occured while exporting sheet ${sheetName} of ${filepath} to csv: ${e}`);
                });
        }, 1000);
    }); */

    return execAsync(`xlsx2csv -n ${sheetName} -d ';' ${filepath} ${output}`).then(() => output)
        .catch(e => {
            if (nbRerun < 10) // workaround: somehow we need to wait, but wait(ms) not working??
                return xlsxToCsv(option);
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
    const filepath = await odsToXlsx(option.filepath, option.outputDir);
    return xlsxToCsv({ ...option, filepath });
}
