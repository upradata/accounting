const csv = require('csvtojson')
const fs = require('fs');
const { execSync } = require('child_process');


module.exports.readFirstLine = file => {
    return new Promise((resolve, reject) => {
        const rs = fs.createReadStream(file, { encoding: 'utf8' });
        let acc = '';
        let pos = 0;
        let index;

        rs
            .on('data', function (chunk) {
                index = chunk.indexOf('\n');
                acc += chunk;
                index !== -1 ? rs.close() : pos += chunk.length;
            })
            .on('close', function () {
                resolve(acc.slice(0, pos + index));
            })
            .on('error', function (err) {
                reject(err);
            })
    });
}

module.exports.csvToJson = async (file, options = {}) => {

    return csv(options)
        .subscribe(row => Object.entries(row).forEach(([k, v]) => {
            const isNumber = /^\d+(,|\.)?\d*$/.test(v); // !isNaN(parseFloat(v));

            if (isNumber) {
                row[k] = parseFloat(v.replace(',', '.'));
            }
        }))
        .fromFile(file);
}

module.exports.toCsv = json => {
    let header = [];

    const csvObjects = [];

    for (const row of json) {
        const headers = Object.keys(row);
        if (headers.length > header.length)
            header = headers;

        csvObjects.push(row);

    }

    let csv = header.join((';'));

    for (const o of csvObjects) {
        const row = {};

        for (const h of header)
            row[h] = o[h] || '';

        csv += '\n' + Object.values(row).join((';'));
    }

    return csv;
}


module.exports.odsToCsv = file => {
    const fileName = path.basename(file);
    const fileNoExt = path.basename(file, '.ods');

    const tmp = path.join(__dirname, 'tmp' + Date.now());

    try { fs.mkdir(tmp) } catch (e) { }

    execSync(`cp ${file} ${tmp} && (cd ${tmp} && UNOPATH=/usr/bin/libreoffice /usr/bin/python3.6 /usr/bin/unoconv -f csv -e FilterOptions="59,34,0,1" ${fileName} && cp ${fileNoExt}.csv ${process.cwd()})`);

    fs.rmdir(tmp);
}
