import { JournauxBalanceByMonth } from './types';
import { Edit, EditOption } from '../../edition/edit';
import { Mouvement } from '../mouvement';
import { BalanceTotalData } from '../balance/balance-total';
import { formattedNumber } from '../../util/compta-util';
import { TableColumns } from '../../edition/table';
import { JournauxBalance } from './journaux-balance';
import { ObjectOf } from '../../util/types';
import { coloryfyDiff } from '../../edition/edit-util';


interface AddToEditOption {
    journal: string;
    mouvement?: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    total: BalanceTotalData;
    monthI?: number;
}

export interface ExtraOption {
    isByJournal: boolean;
}

export class JournalCentraliseurEdit extends Edit<ExtraOption> {
    private isShort = false;
    private isByJournal = false;

    constructor(private journauxBalanceByMonth: JournauxBalanceByMonth) {
        super({ title: 'Journal Centraliseur' });
    }

    protected tableConfig() {
        const length = this.header().length;

        const columns = {} as TableColumns;
        const nbRight = this.isByJournal || this.isShort ? 3 : 5;

        for (let i = length - nbRight; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit(option: EditOption & Partial<ExtraOption>) {
        this.isShort = option.short;
        this.isByJournal = option.isByJournal;

        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';');
    }

    private header(): string[] {
        if (this.isByJournal)
            return [ 'Journal', 'Débit', 'Crédit', 'Solde' ];

        if (this.isShort)
            return [ 'Month', 'Journal', 'Débit Exercise', 'Crédit Exercise', 'Solde' ];

        return [ 'Month', 'Journal', 'Débit', 'Crédit', 'Débit Exercise', 'Crédit Exercise', 'Solde' ];
    }

    private balanceByJournal(): JournauxBalance {
        const balance = new JournauxBalance();

        for (const b of this.journauxBalanceByMonth) {
            for (const { balanceData } of b)
                balance.add(balanceData.mouvements);
        }

        return balance;
    }

    private editByJournal() {
        const balanceByJournal = this.balanceByJournal();

        for (const { key: journal, balanceData } of balanceByJournal)
            this.addToEdit({ journal, total: balanceData.total.data });
    }

    private addToEdit({ journal, mouvement, total, monthI }: AddToEditOption) {
        let debit: string | number = '';
        let credit: string | number = '';

        const format = (n: number | string) => typeof n === 'string' ? n : n === 0 ? '' : formattedNumber(n);

        if (mouvement !== undefined) {
            const { type, montant } = mouvement;

            debit = type === 'debit' ? montant : '';
            credit = type === 'credit' ? montant : '';
        }

        const totalDebit = total.debit;
        const totalCredit = total.credit;
        const solde = coloryfyDiff(total.diff);

        let dataO: ObjectOf<string | number> = undefined;

        if (this.isByJournal)
            dataO = { journal, totalDebit, totalCredit, solde };
        else {
            const date = new Date();
            date.setMonth(monthI + 1);
            const month = date.toLocaleString('fr-FR', { month: 'long' });

            if (this.isShort)
                dataO = { month, journal, totalDebit, totalCredit, solde };
            else
                dataO = { month, journal, debit, credit, totalDebit, totalCredit, solde };
        }


        const dataRaw = Object.values(dataO);

        const nbRight = this.isByJournal ? 1 : 2;
        const dataFormatted = dataRaw.map((v, i) => i >= nbRight ? format(v) : v);

        this.json[ journal ] = dataO;

        this.editorOption.csv += dataRaw.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(dataRaw);
        this.consoleTable.push(dataFormatted);
    }


    doEdit(option: EditOption) {

        if (this.isByJournal)
            return this.editByJournal();


        for (const [ monthI, journauxBalance ] of this.journauxBalanceByMonth.entries()) {
            for (const { key: journal, balanceData } of journauxBalance) {

                if (!this.isShort) {
                    for (const mouvement of balanceData.mouvements) {
                        this.addToEdit({ journal, mouvement, total: balanceData.total.data, monthI });
                    }
                }

                this.addToEdit({ journal, total: balanceData.total.data, monthI });
            }
        }
    }
}
