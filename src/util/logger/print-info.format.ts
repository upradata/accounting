import winston from 'winston';
import { LEVEL, MESSAGE } from 'triple-beam';
import { Info } from './types';


export const printInfoFormat = winston.format.printf((info: Info) => {
    const level = info[ LEVEL ] || info.level;
    const message = info.message || info[ MESSAGE ];

    return `${level}: ${info.stack || message}`;
});
