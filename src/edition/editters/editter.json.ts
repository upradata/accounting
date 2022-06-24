import path from 'path';
import fs from 'fs-extra';
import { logger } from '@util';
import { EditLogger } from '../edit.types';

export const jsonEditter = (options: { what: string; outputDir: string; indent?: number; }): EditLogger => async data => {
    const { what, outputDir, indent = 4 } = options;
    const { json } = data;

    const filename = `${what}.json`;

    await fs.writeJson(path.join(outputDir, filename), json, { encoding: 'utf8', spaces: indent });
    logger.info(`${filename} generated`);
};
