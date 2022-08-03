import { RootService } from '@upradata/dependency-injection';
import { EditExtraOptions, Editter } from '@edition';
import { mapBy, SortedArray } from '@util';
import { Piece } from './piece';
import { PiecesEdit } from './pieces.edit';

@RootService()
export class Pieces {
    public pieces: SortedArray<Piece>;

    constructor() {
        this.pieces = new SortedArray(
            undefined,
            (p1: Piece, p2: Piece) => p1.date === p2.date,
            (p1: Piece, p2: Piece) => p1.date.getTime() - p2.date.getTime()
        ); // ordered by date
    }

    add(...pieces: Piece[]) {
        this.pieces.push(...pieces);
    }

    get(pieceId: string): Piece {
        return this.pieces.array.find(piece => piece.id === pieceId);
    }

    byJournal() {
        return mapBy(this.pieces.array, 'journal');
    }

    async edit(editter: Editter, option?: EditExtraOptions): Promise<void> {
        return new PiecesEdit(this.pieces).edit(editter, option);
    }
}
