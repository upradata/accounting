import { LEVEL, MESSAGE } from 'triple-beam';
import { Logger as WinstonLogger } from 'winston';
import { StyleOption } from './style.format';

export type LogLevels = {
    error: 0;
    warn: 1;
    info: 2;
};

export type LevelNames = keyof LogLevels;
export type LevelMap<T> = Record<LevelNames, T>;


export interface LoggerSettings {
    levels: LogLevels;
    styles: LevelMap<StyleOption>;
    filenames: Omit<LevelMap<string>, 'info'>;
}


export class InfoProps {
    level: string = 'level';
    message: string = 'message';
    stack?: string = 'stack';
}

export class Info extends InfoProps {
    [ MESSAGE ]: string;
    [ LEVEL ]: any;
    style?: StyleOption;
}

export interface Meta {
    style?: StyleOption;
    message?: string;
}


export const DEFAULT_INFO_PROPS = new InfoProps();


/* export interface LeveledLogMethod {
    (message: string): Logger;
    (info: Info): Logger;
    // (message: string, callback: LogCallback): Logger;
    // (message: string, meta: Meta, callback: LogCallback): Logger;
    // (message: string, ...meta: any[]): Logger;
} */

export type LeveledLogMethod = (messageOrInfo: string | Info | { message: string; }, meta?: Meta) => Logger;
export type Logger = Omit<WinstonLogger, LevelNames> & LevelMap<LeveledLogMethod>;
