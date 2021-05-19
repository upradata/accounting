import winston from 'winston';

export const loggerService = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `compta-info.log`
        // - Write all logs error (and below) to `compta-error.log`.
        //
        new winston.transports.File({ filename: 'compta-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'compta-info.log' })
    ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `

if (process.env.NODE_ENV !== 'production') {
    loggerService.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
