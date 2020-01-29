
import path from 'path';
import * as comptaUtil from '../src/util/compta-util';
import { execAsyncCommand, readFileAsync, rmdirAsync, readdirAsync } from './util';
import { Run } from '../src/program.run';
import { fromRoot } from '@upradata/node-util/lib';


const outputDir = fromRoot('Output/Jest');
const dataDirectory = fromRoot('data');

/* interface D {
    exerciseStart: string;
    metadata?: string;
    outputDir: string;
    fec?: string | boolean;
    fecOnlyNonImported?: boolean;
    edit?: boolean;
    editShort?: boolean;
    editGrandLivre?: boolean;
    editBalance?: boolean;
    editJournal?: boolean;
    editPieces?: boolean;
    dataDirectory?: string;
    ods?: StringOrBoolArg;
    listCsv?: ImporterFiles<{ filename: string }>;
}
 */

describe(
    // tslint:disable-next-line: max-line-length
    'Comptabilite test suite snapshots: fec + edit (short and long)', () => {

        beforeAll(() => {
            jest.setTimeout(30000);
            const today = new Date(2019, 6, 31);

            comptaUtil.TODAY.date = today;
            comptaUtil.TODAY.fecFormat = comptaUtil.dateToFecDate(today);
        });

        beforeEach(() => rmdirAsync(outputDir));

        afterAll(() => rmdirAsync(outputDir));

        // tslint:disable: max-line-length
        const configs = [
            { title: 'Build Fec', instance: new Run({ exerciseStart: '01022018', metadata: fromRoot('./metadata.json'), dataDirectory, fec: true, outputDir }) },
            // command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --fec --output-dir ${outputTest}` },
            { title: 'Edit Short', instance: new Run({ exerciseStart: '01022018', metadata: fromRoot('./metadata.json'), dataDirectory, edit: true, editShort: true, outputDir }) },
            // command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --edit --edit-short --output-dir ${outputDir}` },
            { title: 'Edit Long', instance: new Run({ exerciseStart: '01022018', metadata: fromRoot('./metadata.json'), dataDirectory, edit: true, outputDir }) },
            // command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --edit --output-dir ${outputDir}` }
        ];// .map(c => [ c.title, c.command ]);


        for (const { title, instance /* command */ } of configs) {
            test(`Snapshot: ${title}'`, async () => {
                // await rmdirAsync(outputTest);
                // await execAsyncCommand(command);
                await instance.run();

                const files = await readdirAsync(outputDir);
                // console.log(files);
                for (const file of files) {
                    // console.log(path.join(outputTest, file));

                    const data = await readFileAsync(path.join(outputDir, file), { encoding: 'utf8' });
                    if (!data) console.log(file, 'NO DATA');
                    expect(data).toMatchSnapshot();
                }
            });
        }

        /* test.each(configs)(
            'Snapshot: %s', async (title: string, command: string) => {
                console.log(command);
                await execAsyncCommand(command);

                const files = await readdirAsync(outputTest);
                console.log(files);
                for (const file of files) {
                    const data = await readFileAsync(path.join(outputTest, file), { encoding: 'utf8' });
                    expect(data).toMatchSnapshot();
                }
            }); */

    });
