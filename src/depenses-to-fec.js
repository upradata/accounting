const { csvToJson, readFirstLine, odsToCsv } = require('./../../dist/accounting/util/csv-util');
const path = require('path');
const fs = require('fs');
const columnify = require('../columnify');
const fixedWidthString = require('fixed-width-string');
const { Colors } = require('../../linked-modules/@mt/node-util/color/node-colors');

const c = new Colors();
const yellow = c.yellow.$;
const green = c.green.$;
const red = c.red.$;
const highlightMagenta = c.white.bgMagenta.$;
const highlightYellow = c.white.bgYellow.$;
const highlightGreen = c.blue.bgGreen.$;

const dir = p => path.join(__dirname, p);

const helpers = {
    arrayToObjOfArrayById: (array, idKey, { key, filter = v => true } = {}) => {
        return array.reduce((objById, value) => {
            const kValue = value[idKey];
            const k = key ? key(value) : kValue;

            const arr = objById[k] || [];
            if (filter(value))
                arr.push(value);

            if (arr.length > 0)
                objById[k] = arr;

            return objById;
        }, {});
    },

    depensesById: depenses => helpers.arrayToObjOfArrayById(depenses, 'id'),

    piecesById: pieces => helpers.arrayToObjOfArrayById(pieces, 'ref'),

    saisiePiecesById: saisiePieces => helpers.arrayToObjOfArrayById(saisiePieces, 'piece'),

    journauxByCode: journaux => {
        return journaux.reduce((journauxByCode, journal) => { journauxByCode[journal.code] = journal; return journauxByCode; }, {});
    },

    comptesByNumero: comptes => {
        return comptes.reduce((comptesByNumero, compte) => { comptesByNumero[compte.numero] = compte; return comptesByNumero; }, {});
    },

    numberToComma: n => (n + '').replace('.', ','),
    commaToNumber: s => +s.replace(',', '.'),

    pad: (s, padding = '0') => s ? (s + '').padEnd(7, padding) : '',

    getTodayDate: () => {
        const today = new Date();
        let dd = today.getDate();
        let mm = today.getMonth() + 1; //January is 0!

        const yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        return yyyy + mm + dd;
    }
};


class FecBuilder {
    constructor({ fecData, separator = ';', stats = true }) {
        const { depenses, pieces, saisiePieces, comptes, journaux } = fecData;

        this.depensesById = helpers.depensesById(depenses);
        this.piecesById = helpers.piecesById(pieces);
        this.saisiePiecesById = helpers.saisiePiecesById(saisiePieces);
        this.comptesByNumero = helpers.comptesByNumero(comptes);
        this.journauxByCode = helpers.journauxByCode(journaux);

        this.separator = separator;

        if (typeof stats === 'boolean')
            this.logStatsEnabled = { journal: stats, compte: stats };
        else
            this.logStatsEnabled = logStats;

        this.idByJournal = {};

        this.today = FecBuilder.getTodayDate();
    }

    nextPieceId(journal) {
        let id = this.idByJournal[journal] || 0
        this.idByJournal[journal] = ++id;

        return id;
    }


    ecritureSaisieRow({
        depense,
        debitOrCredit,
        compte, compteAux, journal,
        ecritureNumInJournal, ecritureNumberSaisiePiece,
        ecritureInJournalDate = this.today, validationDate = this.today,
        lettrage, dateLettrage
    }) {

        const { libelle, montant, date } = depense;
        const compteLibelle = this.comptesByNumero[compte].libelle;
        const compteAuxLibelle = compteAux ? this.comptesByNumero[compteAux].libelle : '';

        const montantWithComma = FecBuilder.numberToComma(montant);
        const credit = debitOrCredit === 'C' ? montantWithComma : '';
        const debit = debitOrCredit === 'D' ? montantWithComma : '';

        return `${journal};${this.journauxByCode[journal].libelle};${ecritureNumInJournal};${ecritureInJournalDate};${compte};${compteLibelle};${compteAux ? compteAux : ''};${compteAuxLibelle};${ecritureNumberSaisiePiece};${date};${libelle};${debit};${credit};${lettrage};${dateLettrage};${validationDate};;;;;;;IMPORT`.replace(/;/g, this.separator);
    }

    ecritureAchat({ montant, libelle, date, journal = '60', crediteur, debiteur }) {
        const piece = [];
        const { ttc, ht, tva, } = montant;

        const ecriture = ({ montant, debitOrCredit, compte, compteAux }) => piece.push({
            libelle, date, montant, debitOrCredit, compte: FecBuilder.pad(compte), compteAux: FecBuilder.pad(compteAux), journal
        });

        /* ECRITURE JOURNAL ACHATS: credit compte fournisseur 4*** - et - débit compte tva et  compte charge 6*** */
        ecriture({ montant: ttc, debitOrCredit: 'C', compte: crediteur.compte, compteAux: crediteur.compteAux });
        if (tva) {
            ecriture({ montant: tva, debitOrCredit: 'D', compte: 4456611 });
            ecriture({ montant: ht, debitOrCredit: 'D', compte: debiteur.compte, compteAux: debiteur.compteAux });
        } else
            ecriture({ montant: ttc, debitOrCredit: 'D', compte: debiteur.compte, compteAux: debiteur.compteAux });


        return piece;
    }

    ecritureBanque({ montant, libelle, date, journal = 'BQ', compteInfo, type }) {
        const { compte, compteAux } = compteInfo;
        const piece = [];

        const ecriture = ({ debitOrCredit, compte, compteAux }) => piece.push({
            libelle, date, montant, debitOrCredit, compte: FecBuilder.pad(compte), compteAux: FecBuilder.pad(compteAux), journal
        });

        /* ECRITURE JOURNAL BANQUE: credit compte banque 512 - et - débit compte charge 6*** */
        ecriture({ debitOrCredit: type === 'achat' ? 'C' : 'D', compte: 512 });
        ecriture({ debitOrCredit: type === 'achat' ? 'D' : 'C', compte, compteAux });

        return piece;
    }

    ecritureSimple({ libelle, date, montant, compteInfo, debitOrCredit, journal }) {
        const { compte, compteAux } = compteInfo;

        const ecriture = {
            libelle, date, montant, debitOrCredit, compte: FecBuilder.pad(compte), compteAux: FecBuilder.pad(compteAux), journal
        };

        return ecriture;
    }

    ecritureDouble({ libelle, date, montant, crediteur, debiteur, journal }) {
        const piece = [];

        const ecriture = ({ debitOrCredit, compteInfo }) => piece.push(
            this.ecritureSimple({ libelle, date, montant, debitOrCredit, compteInfo, journal })
        );

        ecriture({ debitOrCredit: 'D', compteInfo: debiteur });
        ecriture({ debitOrCredit: 'C', compteInfo: crediteur });

        return piece;
    }

    getEcrituresFromLibelle({ libelle, date, montant }) {
        const mergeInfo = o => ({ libelle, date, ...o });

        if (/(SDM|Loyer)/i.test(libelle)) {
            // 60 Opérations Diverses
            // 6132: Locations immobilieres
            const crediteur = { compte: 401, compteAux: 4011 };
            return [
                this.ecritureAchat(mergeInfo({ montant, journal: 60, crediteur, debiteur: { compte: 6132 } })),
                this.ecritureBanque(mergeInfo({ montant: montant.ttc, compteInfo: crediteur, type: 'achat' }))
            ];
        }
        else if (/frais generaux/i.test(libelle)) {
            // 60 Opérations Diverses
            // 6132: Fournitures administratives
            const crediteur = { compte: 401, compteAux: 4012 };

            return [
                this.ecritureAchat(mergeInfo({
                    montant, journal: 60, crediteur, debiteur: { compte: 6064 }
                })),
                this.ecritureBanque(mergeInfo({ montant: montant.ttc, compteInfo: crediteur, type: 'achat' }))
            ];
        }
        else if (/greffe|inpi|bodacc|kbis/i.test(libelle)) {
            // 60 Opérations Diverses
            // 6132: Fournitures administratives & 4013: Frais Greffe
            const crediteur = { compte: 401, compteAux: 4013 };
            return [
                this.ecritureAchat(mergeInfo({
                    montant, journal: 60, crediteur: crediteur, debiteur: { compte: 6227 }
                })),
                this.ecritureBanque(mergeInfo({ montant: montant.ttc, compteInfo: crediteur, type: 'achat' }))
            ];

        } else if (/compte courant/i.test(libelle)) {
            // 4551 Associés - Comptes courants : Principal
            // 45511 Compte courant associé Thomas Milotti
            // 77881 Produit exceptionel Abandon Compte Thomas Milottti
            return [
                this.ecritureBanque(mergeInfo({ montant: montant.ttc, compteInfo: { compte: 4551, compteAux: 45511 }, type: 'vente' })),
                this.ecritureDouble(mergeInfo({
                    montant: montant.ttc, journal: 90,
                    crediteur: { compte: 77881 }, debiteur: { compte: 4551, compteAux: 45511 }
                }))
            ];
        } else {
            return undefined;
        }
    }


    getCompteMouvementFromString(s) {
        const movements = s.split(';');

        const compteMontantList = movements.map(m => {
            const [comptes, montant] = m.split(':');
            const [compte, compteAux] = comptes.split('.');

            return { compte: FecBuilder.pad(compte), compteAux: FecBuilder.pad(compteAux), montant: parseFloat(montant.replace(',', '.')) };
        });

        return compteMontantList;
    }

    getEcrituresFromCredDebString({ libelle, date, credit, debit, journal }) {
        if (!debit || !debit) {
            console.error(`Le champ "${libelle}" a une colonne debit ou credit mais pas les 2. Veuillez indiquer la 2ème valeur.`);
            return undefined;
        }

        if (!journal) {
            console.error(`Le champ "${libelle}" n'a pas de journal`);
            return undefined;
        }

        const ecriture = o => Object.assign({ libelle, date, journal }, o);

        const compteMontantCreditList = this.getCompteMouvementFromString(credit).map(e => ecriture({ ...e, debitOrCredit: 'C' }));
        const compteMontantDebitList = this.getCompteMouvementFromString(debit).map(e => ecriture({ ...e, debitOrCredit: 'D' }));

        return [...compteMontantCreditList, ...compteMontantDebitList];
    }

    getEcrituresFromPieceRef({ libelle, date, pieceRef }) {
        const piecesRegex = new RegExp(`^${pieceRef}#\\d+`);
        const piecesByIdFiltered = Object.values(this.piecesById).filter(pieces => piecesRegex.test(pieces[0].ref));

        if (!piecesByIdFiltered) return undefined;

        const ecritures = [];
        for (const pieces of piecesByIdFiltered) {
            const piece = [];

            for (const { ref, journal, compte, compteAux, credit, debit } of pieces) {
                piece.push(
                    { libelle, date, montant: credit || debit, debitOrCredit: credit ? 'C' : 'D', compte: FecBuilder.pad(compte), compteAux: FecBuilder.pad(compteAux), journal }
                )
            }

            ecritures.push(piece);
        }

        return ecritures;
    }

    statSum(ecrituresById) {
        const sums = {};

        for (const [id, ecriture] of Object.entries(ecrituresById)) {
            const sum = { credit: 0, debit: 0 };

            for (const { montant, debitOrCredit } of ecriture) {
                if (debitOrCredit === 'C')
                    sum.credit += montant;
                else
                    sum.debit += montant;
            }

            sums[id] = sum;
        }

        return sums;
    }


    creditDebitDiff({ credit, debit }) {
        return credit - debit;
    }

    diffStats(diff, { credit, debit, zero = 'N' }) {
        if (Math.abs(diff) < 0.01)
            return yellow`0.00 ${zero}`;

        const d = (diff > 0 ? diff : -diff).toFixed(2);
        return diff > 0 ? green`${d} ${credit}` : red`${d} ${debit}`;
    }

    align(s, options = {}) {
        const { size = 10, padding = ' ', align = 'left' } = options;
        return fixedWidthString(s, size, { align, padding, ellipsis: '.' });
    }

    logTitleStats(title, color, isBig = false) {
        if (isBig)
            console.log(color`${this.alignCenter(' ', process.stdout.columns)}`);

        console.log(color`${this.alignCenter(title.toUpperCase(), process.stdout.columns)}`);

        if (isBig)
            console.log(color`${this.alignCenter(' ', process.stdout.columns)}`);

        console.log('\n');
    }



    journalStats(ecritures) {
        const ecrituresByJournal = FecBuilder.arrayToObjOfArrayById(ecritures, 'journal');
        const sums = this.statSum(ecrituresByJournal);

        const logs = [];
        for (const [journal, sum] of Object.entries(sums)) {
            if (Math.abs(sum.credit - sum.debit) > 0.01)
                console.warn(`Attention, le journal ${journal} n'est pas équilibré`);

            logs.push({
                journal,
                credit: this.align(sum.credit.toFixed(2), { align: 'right' }),
                debit: this.align(sum.debit.toFixed(2), { align: 'right' }),
                diff: this.align(this.diffStats(this.creditDebitDiff(sum), { credit: 'C', debit: 'D' }), { align: 'right' })
            });
        }

        this.logTitleStats('COMPTE STATISTIQUES:', highlightGreen, true);

        this.logStats(logs, Object.keys(logs[0]), {
            dataTransform: (item, col, i) => col.name === 'journal' ? this.alignCenter(item, col.width) : item
        });
    }


    produitsChargesStats(ecritures) {
        const produits = [];
        const charges = [];

        for (const ecriture of ecritures) {
            if (/^6/.test(ecriture.compte))
                charges.push(ecriture);

            if (/^7/.test(ecriture.compte))
                produits.push(ecriture);
        }


        const sums = this.statSum({ produits, charges });
        const differences = {
            produits: Math.abs(this.creditDebitDiff(sums.produits)),
            charges: Math.abs(this.creditDebitDiff(sums.charges))
        };
        differences.diff = this.creditDebitDiff({ credit: differences.produits, debit: differences.charges });

        const log = {
            produits: differences.produits.toFixed(2),
            charges: differences.charges.toFixed(2),
            diff: this.diffStats(differences.diff, { credit: 'Bénéfice', debit: 'Perte' })
        };

        this.logTitleStats('RESULTAT:', highlightGreen, true);

        this.logStats([log], Object.keys(log), {
            dataTransform: (item, col, i) => col.name !== 'diff' ? this.alignCenter(item, col.width) : this.align(item, { align: 'right', size: 15 })
        });
    }

    compteByClassStats(ecritures) {
        const ecrituresByCompteClass = FecBuilder.arrayToObjOfArrayById(ecritures, 'compte', { key: e => e.compte[0] });
        // XOU: journal de réouverture
        const ecrituresByCompteClassNoXOU = FecBuilder.arrayToObjOfArrayById(
            ecritures, 'compte', {
                key: e => e.compte[0],
                filter: e => (e.journal + '').toLowerCase() !== 'xou',
            });

        this.logTitleStats('COMPTES ABREGES PAR CLASSE:', highlightGreen);

        for (const { ecritureBy, title } of [
            { ecritureBy: ecrituresByCompteClassNoXOU, title: 'Exercise' },
            { ecritureBy: ecrituresByCompteClass, title: 'Global' }]) {

            const sums = this.statSum(ecritureBy);

            const logs = [];
            for (const [compteClass, sum] of Object.entries(sums)) {
                logs.push({
                    compteClass,
                    credit: this.align(sum.credit.toFixed(2), { align: 'right' }),
                    debit: this.align(sum.debit.toFixed(2), { align: 'right' }),
                    diff: this.align(this.diffStats(this.creditDebitDiff(sum), { credit: 'C', debit: 'D' }), { align: 'right' })
                });
            }

            this.logTitleStats(title, highlightMagenta);

            this.logStats(logs, Object.keys(logs[0]), {
                headingTransform: (key, width) => key === 'compteClass' ? this.alignCenter('CLASS', width) : key.toUpperCase(),
                dataTransform: (item, col, i) => col.name === 'compteClass' ? this.alignCenter(item, col.width) : item
            });

            console.log('\n');
        }

        console.log('\n');
    }

    compteDetailedStats(ecritures) {
        const ecrituresByCompte = FecBuilder.arrayToObjOfArrayById(ecritures, 'compte');
        // XOU: journal de réouverture
        const ecrituresByCompteNoXOU = FecBuilder.arrayToObjOfArrayById(ecritures, 'compte',
            { filter: e => (e.journal + '').toLowerCase() !== 'xou' });


        this.logTitleStats('JOURNAL STATISTIQUES:', highlightGreen, true);

        for (const { ecritureBy, title } of [
            { ecritureBy: ecrituresByCompteNoXOU, title: 'Exercise' },
            { ecritureBy: ecrituresByCompte, title: 'Global' }]) {


            const sums = this.statSum(ecritureBy);
            const logs = [];

            for (const [compte, sum] of Object.entries(sums)) {
                logs.push({
                    compte,
                    credit: this.align(sum.credit.toFixed(2), { align: 'right' }),
                    debit: this.align(sum.debit.toFixed(2), { align: 'right' }),
                    diff: this.align(this.diffStats(this.creditDebitDiff(sum), { credit: 'C', debit: 'D' }), { align: 'right' })
                });
            }

            this.logTitleStats(title, highlightMagenta);

            this.logStats(logs, Object.keys(logs[0]), {
                dataTransform: (item, col, i) => col.name === 'compte' ? this.alignCenter(item, col.width) : item
            });

            console.log('\n');
        }
    }
    compteStats(ecritures) {
        this.compteDetailedStats(ecritures);
        this.compteByClassStats(ecritures);
        this.produitsChargesStats(ecritures);
    }

    alignCenter(s, width) {
        const trim = s.trim();
        const trimLength = trim.length;
        const rest = width - trimLength;

        const beginL = Math.floor(rest / 2) - 1; // -1 je ne sais pas pk :)
        const endL = rest - beginL;

        return ' '.repeat(beginL) + trim + ' '.repeat(endL);
    }
    logStats(data, header, options) {
        console.log(columnify(data, {
            columns: header, minWidth: 15, columnSplitter: '|',
            headingTransform: (key, width) => this.alignCenter(key, width).toUpperCase(),
            ...options
        }));
    }

    stats(ecritures) {
        if (this.logStatsEnabled.journal) {
            this.journalStats(ecritures);
            console.log('\n\n');
        }

        if (this.logStatsEnabled.compte) {
            this.compteStats(ecritures);
            console.log('\n\n');
        }
    }

    checkPieceBalance(piece) {
        const credits = piece.filter(e => e.debitOrCredit === 'C').reduce((sum, e) => sum += e.montant, 0);
        const debits = piece.filter(e => e.debitOrCredit === 'D').reduce((sum, e) => sum += e.montant, 0);

        if (Math.abs(credits - debits) > 0.01)
            console.warn(`Attention: la piece de ${piece[0].libelle} n'est pas équilibrée: credit: ${credits.toFixed(2)} !== debit: ${debits.toFixed(2)}`);
    }


    generateEcrituresFromDepenses() {
        const ecritures = [];

        for (const [id, depenses] of Object.entries(this.depensesById)) {

            for (const depense of depenses) {

                let { libelle, ttc, ht, tva, date, journal, credit, debit, pieceRef } = depense;
                let pieces = undefined;

                if (pieceRef) {
                    pieces = this.getEcrituresFromPieceRef({ libelle, date, pieceRef });
                }
                else if (credit || debit) {
                    pieces = this.getEcrituresFromCredDebString({ credit, debit, journal, date });
                } else {
                    pieces = this.getEcrituresFromLibelle({ libelle, montant: { ttc, ht, tva }, date });
                }


                // write ecritures made of piece[] in pieces
                for (const piece of pieces) {
                    this.checkPieceBalance(piece);

                    const journal = piece[0].journal;
                    const pieceId = this.nextPieceId(journal);
                    piece.forEach(ecriture => ecriture.id = `${journal}-${pieceId}`);

                    ecritures.push(...piece); // for each depense
                }
            }
        }


        return ecritures;
    }


    generateEcrituresFromSaisiePieces() {
        const pieces = [];

        for (const [id, mouvements] of Object.entries(this.saisiePiecesById)) {
            const piece = [];

            for (const mouvement of mouvements) {

                let { journal, libelle, date, compte, compteAux, debit, credit } = mouvement;

                const isCredit = credit !== '';
                const ecriture = this.ecritureSimple({
                    libelle, date, montant: isCredit ? credit : debit,
                    compteInfo: { compte, compteAux }, debitOrCredit: isCredit ? 'C' : 'D', journal
                });

                piece.push(ecriture);

            }

            pieces.push(piece);
        }

        const ecritures = [];

        // write ecritures made of piece[] in pieces
        for (const piece of pieces) {
            this.checkPieceBalance(piece);

            const journal = piece[0].journal;
            const pieceId = this.nextPieceId(journal);
            piece.forEach(ecriture => ecriture.id = `${journal}-${pieceId}`);

            ecritures.push(...piece); // for each depense
        }



        return ecritures;
    }

    processLettrage(ecritures) {
        const fournisseursByCompte = FecBuilder.arrayToObjOfArrayById(ecritures, 'compte', {
            filter: e => /^401/.test(e.compte) && (e.journal + '').toLowerCase() !== 'xou' && !/(report|reouverture)/i.test(e.libelle)
        });
        const clientsByCompte = FecBuilder.arrayToObjOfArrayById(ecritures, 'compte', {
            filter: e => /^411/.test(e.compte) && (e.journal + '').toLowerCase() !== 'xou' && !/(report|reouverture)/i.test(e.libelle)
        });

        let i = -1;
        let letter = '';
        const nextLetter = l => {
            i = i > 10000 ? 0 : i + 1;
            if (i === 0) letter += l;

            return letter + i;
        };

        for (const { byCompte, type, letter } of [
            { byCompte: fournisseursByCompte, type: 'fournisseur', letter: 'C' },
            { byCompte: clientsByCompte, type: 'client', letter: 'D' }
        ]) {
            for (const [compte, ecrituresInCompte] of Object.entries(byCompte)) {

                const ecrituresByType = FecBuilder.arrayToObjOfArrayById(ecrituresInCompte, 'debitOrCredit');

                if (ecrituresByType.C) {
                    for (const ecritureC of ecrituresByType.C) {
                        // *100 because montant can have cents => x100 for int comparaison
                        const index = ecrituresByType.D.findIndex(e => e.montant * 100 === ecritureC.montant * 100);
                        if (index === -1) continue;

                        // lettrage
                        const ecritureD = ecrituresByType.D[index];
                        ecritureC.lettrage = ecritureD.lettrage = nextLetter(letter);

                        ecrituresByType.D.splice(index, 1); // delete (they might be few same montant)
                    }
                }

                if (ecrituresByType.D.length > 0) {
                    console.log('\n\n');
                    this.logTitleStats(`Compte ${type} non lettrables:`, highlightYellow);

                    for (const e of ecrituresInCompte.filter(e => e.lettrage))
                        console.log(yellow`${e}`);
                }
            }
        }
    }

    build() {
        const ecritures = [];

        ecritures.push(...this.generateEcrituresFromDepenses());
        ecritures.push(...this.generateEcrituresFromSaisiePieces());

        this.processLettrage(ecritures);

        let fec = 'JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;pieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise;DateRglt;ModeRglt;NatOp;IdClient;IdOrigine\n'.replace(/;/g, this.separator);


        for (const { id, libelle, montant, date, debitOrCredit, compte, compteAux, journal, lettrage } of ecritures) {
            fec += this.ecritureSaisieRow({
                depense: { libelle, montant, date },
                debitOrCredit,
                compte, compteAux, journal,
                ecritureNumInJournal: `ecriture-${id}`, ecritureNumberSaisiePiece: `piece-${id}`,
                lettrage: lettrage || '', dateLettrage: date,
                ecritureInJournalDate: '20190312', validationDate: '20190312'
            }) + '\n';
        }

        this.stats(ecritures);
        return fec;
    }
}

Object.assign(FecBuilder, helpers);



async function fecData() {
    const dataDir = '../../data';

    const files = {
        depenses: dir(path.join(dataDir, 'depenses.csv')),
        comptes: dir(path.join(dataDir, 'comptes.csv')),
        journaux: dir(path.join(dataDir, 'journaux.csv')),
        pieces: dir(path.join(dataDir, 'pieces.csv')),
        saisiePieces: dir(path.join(dataDir, 'saisie-pieces.csv'))
    };


    /* const headerLine = await readFirstLine(files.depenses);

    const headerLC = headerLine.split(';').map(h => h.toLowerCase());
    const headers = headerLC.map(h => {
        if (h.includes('montant'))
            return h.split('montant')[1].trim();

        return h;
    }); */

    const depenses = await csvToJson(files.depenses, { delimiter: ';', headers: ['id', 'libelle', 'ttc', 'ht', 'tva', 'date', 'journal', 'debit', 'credit', 'pieceRef'] });
    const comptes = await csvToJson(files.comptes, { delimiter: ';' });
    const journaux = await csvToJson(files.journaux, { delimiter: ';', headers: ['code', 'libelle', 'type', 'numeroCompte', 'numeroTresorie'] });
    const pieces = await csvToJson(files.pieces, { delimiter: ';' });
    const saisiePieces = await csvToJson(files.saisiePieces, { delimiter: ';' });


    for (const d of depenses) {
        d.ttc = helpers.commaToNumber(d.ttc);
        d.ht = helpers.commaToNumber(d.ht);
        d.tva = helpers.commaToNumber(d.tva);
        d.credit = helpers.commaToNumber(d.credit);
        d.debit = helpers.commaToNumber(d.debit);
    }

    for (const p of pieces) {
        p.credit = helpers.commaToNumber(p.credit);
        p.debit = helpers.commaToNumber(p.debit);
    }

    for (const p of saisiePieces) {
        p.credit = helpers.commaToNumber(p.credit);
        p.debit = helpers.commaToNumber(p.debit);
    }

    return { depenses, pieces, saisiePieces, comptes, journaux };
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
