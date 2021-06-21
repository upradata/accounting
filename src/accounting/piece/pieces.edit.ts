import { ObjectOf, values } from '@upradata/util';
import { TableColumnConfig } from '@upradata/node-util';
import { Edit, EditDataCellStyle, EditExtraOptions } from '@edition';
import { SortedArray, formattedNumber } from '@util';
import { Mouvement } from '../mouvement';
import { Piece, PieceOption } from './piece';
import { ExtraOption } from '../journal-centraliseur';


type AddToEditOption = PieceOption & { id: string; mouvement: Mouvement; };


export class PiecesEdit extends Edit {
    private currentPieceId: string = '';

    constructor(private pieces: SortedArray<Piece>) {
        super({ title: 'Pièces' });
    }


    protected override doInit() {
        this.addHeaders([ 'Id', 'Libelle', 'Date', 'Journal', 'Débit', 'Crédit' ]);
        this.setTableConfig(this.tableConfig);
    }


    private tableConfig(i: number, length: number): EditDataCellStyle {

        if (i === 0 || i === 3)
            return { alignment: 'center' };

        if (i >= length - 2)
            return { alignment: 'right' };

        return { alignment: 'left' };
    }


    private addToEdit({ id, libelle, date: d, journal, mouvement }: AddToEditOption) {

        this.currentPieceId = id;

        const { type, montant } = mouvement;

        const debit = type === 'debit' ? montant : '';
        const credit = type === 'credit' ? montant : '';


        const date = d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';

        const dataO = { id, libelle, date, journal, debit, credit };
        const row = values(dataO);

        this.addData({
            string: row.map(d => ({ value: d, format: (s, i) => i > 3 ? formattedNumber(s, { zero: '' }) : s })),
            json: { key: journal, value: dataO }
        });
    }


    protected override doEdit(_option: EditExtraOptions) {
        for (const piece of this.pieces) {
            for (const mouvement of piece.mouvements)
                this.addToEdit({ ...piece, mouvement });
        }
    }
}
