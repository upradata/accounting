import { Key } from '@upradata/util';
import { styles, TerminalStyles, Style } from '@upradata/node-util';
import winston from 'winston';
import { Styler } from './style.format';
import { LoggerSettings, DEFAULT_INFO_PROPS as INFO_PROPS, Info, LevelNames, Logger } from './types';
import { LEVEL, MESSAGE } from 'triple-beam';


const stylize = (s: string, prop: Key, info: Info, options: { color: TerminalStyles, level: LevelNames; }) => {
    const { color, level } = options;

    const getData = () => {
        const style = styles.none.copy<Style>();
        style.add(color);

        if (info.style)
            style.add(...Styler.getStyleTransform(info.style));

        if (prop === INFO_PROPS.level)
            return {
                style: style.add(styles.bold),
                text: level === 'error' && info.stack ? `${s}(stack)` : s
            };

        if (prop === INFO_PROPS.message || prop === INFO_PROPS.stack) {
            return {
                style: style.add(level !== 'info' ? styles.italic : styles.none),
                text: s
            };
        }

        return {
            style,
            text: s
        };
    };

    const { style, text } = getData();

    return style.$$(text);
};


const loggerSettings: LoggerSettings = {
    levels: {
        error: 0,
        warn: 1,
        info: 2
    },
    styles: {
        error: (s, prop, info) => stylize(s, prop, info, {
            color: prop === INFO_PROPS.stack ? styles.magenta : styles.red,
            level: 'error'
        }),
        warn: (s, prop, info) => stylize(s, prop, info, { color: styles.yellow, level: 'warn' }),
        info: (s, prop, info) => stylize(s, prop, info, { color: styles.green, level: 'info' }),
    }
};


export const logger: Logger = winston.createLogger({
    levels: loggerSettings.levels,
    level: 'info',
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `compta-info.log`
        // - Write all logs error (and below) to `compta-error.log`.
        //
        new winston.transports.File({
            filename: 'compta-error.log',
            level: 'error',
            format: winston.format.combine(
                // winston.format.errors({ stack: true }),
                // winston.format.json({ space: 4 }),
                winston.format.simple()
            )
        }),
        new winston.transports.File({
            filename: 'compta-info.log',
            format: winston.format.combine(
                // winston.format.json({ space: 4 }),
                winston.format.simple()
            )
        })
    ]
});


const logError = logger.error.bind(logger);

// in winston-transport/index.js, inside the _write method of the stream, before passing info to the format.transform
// there is Object.assign({}, info) ==> It is well known that Object.assign copies only an object's OWN properties
// it is the case for Error.stack/Error.message not being copied ==> So here we copy manually these properties in a classic object {}
logger.error = (...args: any[]) => {
    const [ info, ...rest ] = args;

    if (info instanceof Error)
        return logError({ message: info.message, stack: info.stack, name: info.name }, ...rest);

    logError(...args);
};

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `

if (process.env.NODE_ENV !== 'production') {

    logger.add(new winston.transports.Console({
        stderrLevels: [ 'error' ],
        consoleWarnLevels: [ 'warn' ],
        format: winston.format.combine(
            // winston.format.colorize({ colors: loggerSettings.colors.levels, level: true }),
            // winston.format.colorize({ colors: loggerSettings.colors.message, message: true }),
            new Styler({ styles: loggerSettings.styles, props: [ INFO_PROPS.level, INFO_PROPS.message, INFO_PROPS.stack ] }),
            // winston.format.errors({ stack: true }),
            winston.format.printf((info: Info) => {
                const level = info[ LEVEL ] || info.level;
                const message = info.message || info[ MESSAGE ];

                return `${level}: ${info.stack || message}`;
            })
            // winston.format.simple()
        )
    }));
}
