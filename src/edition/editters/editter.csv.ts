import path from 'path';
import fs from 'fs-extra';
import { logger } from '@util';
import { EditLogger } from '../edit.types';

export const csvEditter = (options: { what: string; outputDir: string; }): EditLogger => async data => {
    const { what, outputDir } = options;
    const { headers, rows } = data;

    const filename =  `${what}.csv`;

    const header = `${headers.at(-1).join(';')}`;
    const csv = rows.reduce((csv, { row }) => `${csv}\n${row.join(';')}`, header);

    await fs.writeFile(path.join(outputDir,filename), csv, { encoding: 'utf8' });
    logger.info(`${filename} generated`);
};
