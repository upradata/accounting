import fs from 'fs-extra';
import { Terminal, styles } from '@upradata/node-util';
import { logger } from '@util';
import { EditLogger } from './edit.types';


const write = (filename: string, data: string) => fs.writeFile(filename, data, { encoding: 'utf8' })
    .then(() => logger.info(`${filename} generated`));


const makeLogger = (fn: Function) => fn as EditLogger;

export const editters = {
    console: makeLogger(async ({ title, tableRows, tableConfig }) => {
        const { isTTY } = process.stdout;
        const consoleColumns = process.stdout.columns || 80;

        const terminal = new Terminal({ maxWidth: { row: { width: isTTY ? consoleColumns : 200 } }, tableConfig });

        const header = title ? terminal.title(title, { color: styles.white.bgMagenta.$, isBig: true }) : '';
        terminal.table({ data: tableRows });

        console.log(header);
        console.log(tableRows);
    }),

    csv: (file: string) => makeLogger(async ({ title, tableRows }) => write(file, `${title}\n${tableRows}`)),

    json: (file: string) => makeLogger(async ({ json }) => write(file, json)),

    pdf: (file: string) => makeLogger(async ({ json }) => write(file, json)),

    html: (file: string) => makeLogger(async ({ json }) => write(file, json))
};
