import { SortedArray } from '../../util/sorted-array';
import { Mouvement } from '../mouvement';
import { Edit, EditOption } from '../../edition/edit';
import { Piece, PieceOption } from './piece';
import { TableColumns } from '../../edition/table';
import { ExtraOption } from '../journal-centraliseur/journal-centraliseur.edit';
import { formattedNumber } from '../../util/compta-util';
import { ObjectOf } from '../../util/types';


type AddToEditOption = PieceOption & { id: string; mouvement: Mouvement };


export class PiecesEdit extends Edit {
    private currentPieceId: string = '';

    constructor(private pieces: SortedArray<Piece>) {
        super({ title: 'Pièces' });
    }

    protected tableConfig() {
        const length = this.header().length;

        const columns = {} as TableColumns;

        columns[ 0 ] = { alignment: 'center' };
        columns[ 3 ] = { alignment: 'center' };

        for (let i = length - 2; i < length; ++i)
            columns[ i ] = { alignment: 'right' };

        return { columns };
    }

    doInit(option: EditOption & Partial<ExtraOption>) {
        const header = this.header();

        this.consoleTable = [ header ];
        this.textTable = [ header ];
        this.editorOption.csv = header.join(';') + '\n';
    }

    private header(): string[] {
        return [ 'Id', 'Libelle', 'Date', 'Journal', 'Débit', 'Crédit' ];
    }

    private formatRow(row: Array<number | string>) {
        const format = (n: number | string) => typeof n === 'string' ? n : n === 0 ? '' : formattedNumber(n);
        return row.map((v, i) => i > 3 ? format(v) : v);
    }

    private addToEdit({ id, libelle, date: d, journal, mouvement }: AddToEditOption) {
        const isNewPiece = this.currentPieceId === id ? false : true;
        this.currentPieceId = id;

        const { type, montant } = mouvement;

        const debit = type === 'debit' ? montant : '';
        const credit = type === 'credit' ? montant : '';


        const date = d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '';

        const dataO: ObjectOf<string | number> = { id, libelle, date, journal, debit, credit };

        const row = Object.values(dataO);
        const rowFormatted = this.formatRow(row);

        this.setJson(journal, dataO);

        this.editorOption.csv += row.join(';') + '\n';

        this.editorOption.pdf += ''; // Not yet implemented

        this.textTable.push(rowFormatted);
        this.consoleTable.push(rowFormatted);
    }


    doEdit(option: EditOption) {
        for (const piece of this.pieces) {
            for (const mouvement of piece.mouvements)
                this.addToEdit({ ...piece, mouvement });
        }
    }
}