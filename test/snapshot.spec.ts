import path from 'path';
import fs from 'fs-extra';
import { fromRoot } from '@upradata/node-util';
import * as comptaUtil from '../src/util/compta-util';
import { Run } from '../src/program.run';
import { cliParserDate, ConsoleArguments, ProgramArguments } from '../src/program.arguments';

jest.setTimeout(30000);


const outputDir = fromRoot('Output/Jest');
const dataDirectory = fromRoot('data');

describe(
    // tslint:disable-next-line: max-line-length
    'Comptabilite test suite snapshots: fec + edit (short and long)', () => {

        beforeAll(() => {
            const today = new Date(2019, 6, 31);

            comptaUtil.TODAY.date = today;
            comptaUtil.TODAY.fecFormat = comptaUtil.dateToFecDate(today);
        });

        beforeEach(async () => {
            await fs.remove(outputDir);
            await fs.ensureDir(outputDir);
        });

        afterAll(() => fs.remove(outputDir));

        const commonConfig = (odsFilename: string): ConsoleArguments => ({
            exerciseStart: cliParserDate('01022018'),
            metadata: fromRoot('./metadata.json'),
            dataDirectory,
            inputOds: odsFilename,
            outputDir
        });


        const configs = [
            {
                title: 'Build Fec with No Ecriture Generators',
                instance: new Run(new ProgramArguments({ ...commonConfig('comptabilite.no-ecriture-generators.ods'), fec: true }))
            },
            {
                title: 'Build Fec',
                instance: new Run(new ProgramArguments({ ...commonConfig('comptabilite.ods'), fec: true }))
            },
            {
                title: 'Build Fec Only Non Imported',
                instance: new Run(new ProgramArguments({ ...commonConfig('comptabilite.ods'), fec: true, fecOnlyNonImported: true }))
            },
            {
                title: 'Edit Short',
                instance: new Run(new ProgramArguments({ ...commonConfig('comptabilite.ods'), edit: true, editters: [ 'csv', 'json' ], editShort: true }))
            },
            {
                title: 'Edit Long',
                instance: new Run(new ProgramArguments({ ...commonConfig('comptabilite.ods'), edit: true, editters: [ 'csv', 'json' ] }))
            },
        ];


        for (const { title, instance } of configs) {
            test(`Snapshot: ${title}'`, async () => {

                await instance.run();

                const files = await fs.readdir(outputDir);

                await Promise.all(files.map(async file => {
                    const data = await fs.readFile(path.join(outputDir, file), { encoding: 'utf8' });
                    if (!data)
                        console.log(file, 'NO DATA');

                    expect(data).toMatchSnapshot(`${title}: ${path.extname(file)}`);
                }));
            });
        }
    });
