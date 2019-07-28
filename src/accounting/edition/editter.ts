export type EditLogger = (content: string) => Promise<any>;

class EditterFormats {
    pdf;
    csv;
    text;
    console;
    json;
}

export type EditterLoggers = { [ K in keyof EditterFormats ]?: EditLogger[] };

/*export class EditOption2 {
     pdf: boolean | { filename: string; };
    csv: boolean | { filename: string; separator: string; };
    text: boolean | { filename: string; lineWidth: number; };
    console: boolean | { color: boolean; };
    json: boolean | { filename: string; }; 
}*/

export type EditterOption = { [ K in keyof EditterFormats ]?: string };

// export type EditData = { [ K in keyof EditFormats ]?: string };

export class EditterArgs {
    loggers: EditterLoggers;
    // directory: string = path.join(__dirname, 'edit');
}

export class Editter {
    loggers: EditterLoggers;

    constructor(args: EditterArgs) {
        this.loggers = args.loggers || { console: [ s => Promise.resolve(console.log(s)) ] };
    }

    edit(option: EditterOption): Promise<void[]> {
        const promises: Promise<void>[] = [];

        for (const [ format, loggers ] of Object.entries(this.loggers)) {
            const content = option[ format ] as string;

            if (content) {
                for (const logger of loggers)
                    promises.push(logger(content));
            } else {
                console.warn(`Edition not handle for ${format}`);
            }
        }

        return Promise.all(promises);
    }

}
