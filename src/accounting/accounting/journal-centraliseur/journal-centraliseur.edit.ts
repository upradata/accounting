import { JournauxBalanceByMonth } from './types';
import { Edit } from '../../edition/edit';
import { Mouvement } from '../mouvement';
import { BalanceTotal } from '../balance/balance-total';


interface AddToEditOption {
    journal: string;
    mouvement: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    total: BalanceTotal;
    monthI: number;
}


export class JournalCentraliseurEdit extends Edit {
    constructor(private journauxBalanceByMonth: JournauxBalanceByMonth) {
        super({ title: 'Journal Centraliseur' });
    }

    private initEdit() {
        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';');
    }

    private header(): string[] {
        return [ 'Month', 'Journal', 'Débit', 'Crédit', 'Débit Exercise', 'Crédit Exercise' ];
    }

    private addToEdit({ journal, mouvement, total, monthI }: AddToEditOption) {
        const { type, montant } = mouvement;

        const debit = type === 'debit' ? montant : '';
        const credit = type === 'credit' ? montant : '';
        const date = new Date();
        date.setMonth(monthI);
        const month = date.toLocaleString('fr-FR', { month: 'long' });

        const data = [ month, journal, debit, credit, total.data.debit, total.data.credit ];

        this.editorOption.csv += data.join(';');

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(data);
        this.consoleTable.push(data);
    }


    doEdit() {
        this.initEdit();

        for (const [ monthI, journauxBalance ] of this.journauxBalanceByMonth.entries()) {
            for (const { key: journal, balanceData } of journauxBalance) {

                this.json[ journal ] = balanceData.mouvements;

                for (const mouvement of balanceData.mouvements) {
                    this.addToEdit({ journal, mouvement, total: balanceData.total, monthI });
                }
            }
        }
    }
}
