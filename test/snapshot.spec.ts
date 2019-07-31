import { execAsyncCommand, readFileAsync, rmdirAsync, readdirAsync } from './util';
import * as path from 'path';

const outputTest = path.join(__dirname, '../Output/Jest');
const dataDirectory = path.join(__dirname, '../data');

describe(
    // tslint:disable-next-line: max-line-length
    'Comptabilite test suite snapshots: fec + edit (short and long)', () => {

        beforeAll(() => {
            jest.setTimeout(30000);
        });

        beforeEach(() => rmdirAsync(outputTest));

        afterAll(() => rmdirAsync(outputTest));

        // tslint:disable: max-line-length
        const configs = [
            { title: 'Build Fec', command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --fec --output-dir ${outputTest}` },
            { title: 'Edit Short', command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --edit --edit-short --output-dir ${outputTest}` },
            { title: 'Edit Long', command: `node dist/index.js --exercise-start 01022018 --metadata ./metadata.json --data-directory ${dataDirectory} --edit --output-dir ${outputTest}` }
        ];// .map(c => [ c.title, c.command ]);


        for (const { title, command } of configs) {
            test(`Snapshot: ${title}'`, async () => {
                // await rmdirAsync(outputTest);
                await execAsyncCommand(command);

                const files = await readdirAsync(outputTest);
                // console.log(files);
                for (const file of files) {
                    // console.log(path.join(outputTest, file));

                    const data = await readFileAsync(path.join(outputTest, file), { encoding: 'utf8' });
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
