import { numberToComma } from '../util/util';
import { Mouvement, Lettrage } from './mouvement';
import { writeFile as fsWriteFile } from 'fs';
import { promisify } from 'util';
import { Injector, InjectDep } from '../util/di';
import { PlanComptable } from '../metadata/plan-comptable';
import { Journaux } from '../metadata/journaux';
import { dateToFecDate, TODAY } from '../util/compta-util';
import { Pieces } from './piece/pieces';


const writeFile = promisify(fsWriteFile);

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
        this.pieces = Injector.app.get(Pieces);
        this.planComptable = Injector.app.get(PlanComptable);
        this.journaux = Injector.app.get(Journaux);

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

        // tslint:disable-next-line: max-line-length
        return `${journal};${journalLibelle};${ecritureId};${ecritureDate};${compte.numero};${compteLibelle};${compteAux ? compteAux.numero : ''};${compteAuxLibelle};${pieceId};${dateToFecDate(date)};${libelle};${debit};${credit};${letter};${lettrageDate};${validationDate};;;;;;;IMPORT`.replace(/;/g, this.separator);

        // ;;;;;;;IMPORT comes from Memsoft Oxygene. Normally FEC does not need it
    }


    generate(mouvements: Mouvement[]) {
        //  this.processLettrage(ecritures);

        // tslint:disable-next-line: max-line-length
        this.fec = 'JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;pieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise;DateRglt;ModeRglt;NatOp;IdClient;IdOrigine\n'.replace(/;/g, this.separator);


        for (const mouvement of mouvements) {

            if (!this.onlyNonImported || this.onlyNonImported && !this.pieces.get(mouvement.pieceId).isImported) {

                this.fec += this.ecritureMouvement({
                    mouvement,
                    ecritureId: `ecriture-${mouvement.pieceId}`,
                    ecritureDate: TODAY.fecFormat,
                    validationDate: '20190312',
                }) + '\n';
            }
        }

        return this.fec;
    }

    writeFile(filename: string) {
        return writeFile(filename, this.fec, { encoding: 'utf8' })
            .then(() => console.log(`FEC file generated: ${filename}`))
            .catch(e => console.log(`Erro while writing FEC file in ${filename}: ${e}`));
    }
}
