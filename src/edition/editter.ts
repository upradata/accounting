import { entries } from '@upradata/util';
import { logger } from '@util';
import { EditterLoggers, EditterOption } from './edit.types';




export class EditterArgs {
    loggers: EditterLoggers;
}

export class Editter {
    loggers: EditterLoggers;

    constructor(args: EditterArgs) {
        this.loggers = args.loggers || { console: s => Promise.resolve(console.log(s)) };
    }

    edit(option: EditterOption): Promise<void[]> {

        const promises: Promise<void>[] = entries(this.loggers).flatMap(([ format, editLogger ]) => {
            const content = option[ format ] as string;

            if (!editLogger)
                return undefined;

            if (content)
                return editLogger(content);

            logger.info(`Edition not handle for ${format}`);
            return undefined;

        }).filter(v => !!v);


        return Promise.all(promises);
    }

}
