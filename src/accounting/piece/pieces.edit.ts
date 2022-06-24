import { values } from '@upradata/util';
import { Edit, EditDataCellStyle, EditExtraOptions } from '@edition';
import { formattedNumber, SortedArray } from '@util';
import { Mouvement } from '../mouvement';
import { Piece, PieceOption } from './piece';


type AddToEditOption = PieceOption & { id: string; mouvement: Mouvement; };


export class PiecesEdit extends Edit {

    constructor(private pieces: SortedArray<Piece>) {
        super({ title: 'Pièces' });
    }


    protected override doInit() {
        this.addHeaders([ 'Id', 'Libelle', 'Date', 'Journal', 'Débit', 'Crédit' ]);

        const format = (i: number, length: number): EditDataCellStyle => {

            if (i === 0 || i === 3)
                return { alignment: 'center' };

            if (i >= length - 2)
                return { alignment: 'right' };

            return { alignment: 'left' };
        };

        this.setTableFormat(format);
    }


    private addToEdit({ id, libelle, date: d, journal, mouvement }: AddToEditOption) {
        const { type, montant } = mouvement;

        const debit = type === 'debit' ? montant : '';
        const credit = type === 'credit' ? montant : '';


        const date = d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';

        const dataO = { id, libelle, date, journal, debit, credit };
        const row = values(dataO);

        this.addData({
            string: row,
            format: (data, i) => ({ value: i > 3 ? formattedNumber(data, { zero: '' }) : data, style: { type: i > 3 ? 'number' : 'text' } }),
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
