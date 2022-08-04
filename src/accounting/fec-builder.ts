import path from 'path';
import fs from 'fs-extra';
import { AppInjector } from '@upradata/dependency-injection';
import { colors } from '@upradata/node-util';
import { Journaux, PlanComptable } from '@metadata';
import { dateToFecDate, logger, numberToComma, TODAY } from '@util';
import { Lettrage, Mouvement } from './mouvement';
import { Pieces } from './piece';


export class FecBuilderOption {
    separator?: string = ';';
    onlyNonImported?: boolean = false;
}

interface SaisieArgs {
    mouvement: Mouvement;
    ecritureId: string;
    ecritureDate: string;
    validationDate: string;
}

export class FecBuilder {
    private pieces?: Pieces;
    private separator: string;
    public fec: string = '';
    private planComptable: PlanComptable;
    private journaux: Journaux;
    private onlyNonImported: boolean;

    constructor(option: FecBuilderOption = {}) {
        this.pieces = AppInjector.root.get(Pieces);
        this.planComptable = AppInjector.root.get(PlanComptable);
        this.journaux = AppInjector.root.get(Journaux);

        Object.assign(this, new FecBuilderOption(), option);
    }


    private ecritureMouvement(args: SaisieArgs) {
        const { mouvement, ecritureId, ecritureDate, validationDate } = args;
        const { pieceId, libelle, date, journal, montant, compteInfo, type, lettrage = {} as Lettrage } = mouvement;
        const { compte, compteAux } = compteInfo;


        const compteLibelle = this.planComptable.getFromNumero(compte.numero).libelle;
        const compteAuxLibelle = compteAux ? this.planComptable.getFromNumero(compteAux.numero).libelle : '';

        const journalLibelle = this.journaux.getFromCode(journal).libelle;
        const montantWithComma = numberToComma(montant);
        const isCredit = type === 'credit';

        const credit = isCredit ? montantWithComma : '';
        const debit = !isCredit ? montantWithComma : '';

        const letter = lettrage.letter || '';
        const lettrageDate = lettrage.date ? dateToFecDate(date) : '';

        // eslint-disable-next-line max-len
        return `${journal};${journalLibelle};${ecritureId};${ecritureDate};${compte.numero};${compteLibelle};${compteAux ? compteAux.numero : ''};${compteAuxLibelle};${pieceId};${dateToFecDate(date)};${libelle};${debit};${credit};${letter};${lettrageDate};${validationDate};;;;;;;IMPORT`.replace(/;/g, this.separator);

        // ;;;;;;;IMPORT comes from Memsoft Oxygene. Normally FEC does not need it
    }


    generate(mouvements: Mouvement[]) {
        //  this.processLettrage(ecritures);

        // eslint-disable-next-line max-len
        this.fec = 'JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;pieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise;DateRglt;ModeRglt;NatOp;IdClient;IdOrigine\n'.replace(/;/g, this.separator);


        for (const mouvement of mouvements) {

            if (!this.onlyNonImported || !this.pieces.get(mouvement.pieceId).isImported) {

                this.fec += `${this.ecritureMouvement({
                    mouvement,
                    ecritureId: `ecriture-${mouvement.pieceId}`,
                    ecritureDate: TODAY.fecFormat,
                    validationDate: '20190312',
                })}\n`;
            }
        }

        return this.fec;
    }

    async writeFile(filePath: string) {
        const { name: stem, ext, dir } = path.parse(filePath);

        await Promise.all([
            { filePath: path.join(dir, `${stem}.unix${ext}`), content: this.fec },
            { filePath: path.join(dir, `${stem}.windows${ext}`), content: this.fec.replace(/\n/gm, '\r\n') }
        ].map(async ({ filePath, content }) => {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, { encoding: 'utf8' });
            logger.info(`FEC file generated: ${filePath}`, { style: colors.bold.transform });
        }));
    }
}
