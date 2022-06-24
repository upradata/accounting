import { entries } from '@upradata/util';
// import { logger } from '@util';
import { EditterLoggers, EditterOption } from './edit.types';




export class EditterArgs {
    loggers: EditterLoggers;
}

export class Editter {
    loggers: EditterLoggers;

    constructor(args: EditterArgs) {
        this.loggers = args.loggers || { console: s => Promise.resolve(console.log(s)) };
    }

    async edit(option: EditterOption): Promise<void> {

        await Promise.all(entries(this.loggers).map(([ _format, editLogger ]) => {
            // const content = option[ format ];

            if (!editLogger)
                return undefined;

            return editLogger(option);

            // logger.info(`Edition not handle for ${format}`);
            // return undefined;

        })); // .filter(v => !!v);
    }

}
