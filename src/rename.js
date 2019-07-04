const fs = require('fs');
const path = require('path');
const glob = require('glob');


const firstLetterCap = s => {
    const splits = s.split(/\s+/);
    const firstLetterUpperCase = splits.map(s => s[0].toUpperCase() + s.slice(1).toLowerCase());

    return firstLetterUpperCase.join('');
}

function renameExtrait1() {
    const files = glob.sync(path.join(__dirname, 'Extrait compte*'));

    for (const file of files) {
        const basename = path.basename(file, '.pdf');
        const splits = basename.split('-');
        const len = splits.length;

        const date = splits[len - 1].trim();
        const year = date.slice(4);
        const month = date.slice(2, 4);
        const day = date.slice(0, 2);

        const newName = firstLetterCap(splits[0].trim()) + '-' + year + month + day + '.pdf';
        fs.renameSync(file, path.join(path.dirname(file), newName));
    }
}


function renameExtrait2() {
    const files = glob.sync(path.join(__dirname, 'EXTRAIT*'));

    for (const file of files) {
        const basename = path.basename(file, '.pdf');
        const splits = basename.split('-');


        const newName =/*  firstLetterCap(splits[0].trim())  */'ExtraitCompte' + '-' + splits[2] + '.pdf';
        fs.renameSync(file, path.join(path.dirname(file), newName));
    }
}


function renameFacturePro1() {
    const files = glob.sync(path.join(__dirname, '../Factures/Big/*'));

    for (const file of files) {
        const basename = path.basename(file, '.pdf');
        const splits = basename.split('-');
        const len = splits.length;

        /* const date = splits[len - 1].trim();
        const year = date.slice(4);
        const month = date.slice(2, 4);
        const day = date.slice(0, 2); */
        const date = splits[len - 1].trim();
        const year = date.slice(6) + date.slice(4, 6);
        const month = date.slice(0, 2);
        const day = date.slice(2, 4);

        const newName = 'Facture' + '-' + year + month + day + '.pdf';
        fs.renameSync(file, path.join(path.dirname(file), newName));
    }
}




function renameFactureAgios() {
    const files = glob.sync(path.join(__dirname, '../Agios/*'));

    for (const file of files) {
        const basename = path.basename(file, '.pdf');
        const splits = basename.split('-');

        const newName = 'Agios' + '-' + splits[2] + '.pdf';
        fs.renameSync(file, path.join(path.dirname(file), newName));
    }
}

renameFactureAgios();
