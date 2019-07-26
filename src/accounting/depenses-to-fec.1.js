const { csvToJson, readFirstLine, odsToCsv } = require('./util/csv-util');
const path = require('path');
const fs = require('fs');





class FecBuilder {
    constructor({ fecData, separator = ';', stats = true }) {

        if (typeof stats === 'boolean')
            this.logStatsEnabled = { journal: stats, compte: stats };
        else
            this.logStatsEnabled = logStats;

    }





}







fecData().then(fecData => {
    const converter = new FecBuilder({ separator: '|', fecData });
    const fec = converter.build();

    // console.log(fec);
    const siren = '801265372';
    const endExercise = '20180131';

    const fecFileNameConvetion = isWindows => `${siren}FEC${endExercise}${isWindows ? '.windows' : ''}.txt`;

    fs.writeFileSync('fec.csv', new FecBuilder({ separator: ';', fecData, stats: false }).build(), { encoding: 'utf8' });
    fs.writeFileSync(fecFileNameConvetion(false), fec, { encoding: 'utf8' });
    fs.writeFileSync(fecFileNameConvetion(true), fec.replace(/\n/g, '\r\n'), { encoding: 'utf8' });

    console.log(`fec.csv generated`);
    console.log(`${fecFileNameConvetion(false)} generated`);
    console.log(`${fecFileNameConvetion(true)} generated`);
});
