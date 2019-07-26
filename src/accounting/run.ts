import { Accounting } from './accounting/accounting';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Editter } from './edition/editter';
import { ProgramArguments, programArgs } from './program-args';

const writeFileAsync = promisify(fs.writeFile);


class Run {
    private accounting: Accounting = new Accounting();


    constructor(private programArgs: ProgramArguments) {
    }


    async run() {
        await this.accounting.importComptaData({
            directory: __dirname,
            odsFilename: '../../data/compta.ods'
        });

        this.accounting.processLettrage();

        const promises: Promise<any>[] = [];

        const fec = this.programArgs.fec;
        if (fec)
            promises.push(this.generateFec(fec));


        const edit = this.programArgs.edit;
        if (edit)
            promises.push(...this.edit(edit));


        return Promise.all(promises);
    }

    generateFec(outputFec: string | boolean): Promise<any> {
        const output = typeof outputFec === 'string' ? outputFec : undefined;
        const outputFilename = /\.\w+$/.test(output) ? output : undefined;
        const outputDir = outputFilename ? undefined : output;

        return this.accounting.generateFec({ separator: ';', outputFilename, outputDir });
    }

    edit(outputDir: string | boolean): Promise<any>[] {
        const promises: Promise<any>[] = [];
        const dir = typeof outputDir === 'string' ? outputDir : '';

        const editter = (filename: string) => new Editter({
            loggers: {
                console: [ s => Promise.resolve(console.log(s)) ],
                csv: [ s => writeFileAsync(path.join(dir, `${filename}.csv`), s, { encoding: 'utf8' }) ],
                json: [ s => writeFileAsync(path.join(dir, `${filename}.json`), s, { encoding: 'utf8' }) ],
            }
        });

        promises.push(this.accounting.grandLivre.mouvementsCompte.edit(editter('grand-livre')));
        promises.push(this.accounting.balanceDesComptes.edit(editter('balance-comptes')));
        promises.push(this.accounting.journalCentraliseur.edit(editter('journal-centraliseur')));

        return promises;
    }

}


new Run(programArgs).run();
