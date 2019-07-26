export type EditLogger = (content: string) => Promise<void>;

class EditFormats {
    pdf;
    csv;
    text;
    console;
    json;
}

export type EditLoggers = { [ K in keyof EditFormats ]?: EditLogger[] };

/*export class EditOption2 {
     pdf: boolean | { filename: string; };
    csv: boolean | { filename: string; separator: string; };
    text: boolean | { filename: string; lineWidth: number; };
    console: boolean | { color: boolean; };
    json: boolean | { filename: string; }; 
}*/

export type EditOption = { [ K in keyof EditFormats ]?: string };

// export type EditData = { [ K in keyof EditFormats ]?: string };

export class EditArgs {
    loggers: EditLoggers;
    // directory: string = path.join(__dirname, 'edit');
}

export class Editter {
    loggers: EditLoggers;

    constructor(args: EditArgs) {
        this.loggers = args.loggers || { console: [ s => Promise.resolve(console.log(s)) ] };
    }

    edit(option: EditOption): Promise<void[]> {
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
