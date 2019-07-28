import { CompteInfo } from '../compte';
import { Mouvement, MouvementData, MouvementMetadata } from '../mouvement';
import { InjectDep, Injector } from '../../util/di';
import { GrandLivre } from '../grand-livre/grand-livre';


export interface PieceOption {
    libelle: string;
    date: Date;
    journal: string;
}


export interface MouvementPartieDouble {
    montant: number | string;
    crediteur: CompteInfo;
    debiteur: CompteInfo;
}


export class Piece {
    id: string;
    libelle: string;
    date: Date;
    journal: string;
    private isClosed: boolean = false;
    mouvements: Mouvement[] = [];
    grandLivre: GrandLivre;

    static idByJournal = {} as { [ k: string ]: number };

    constructor(option: PieceOption) {
        for (const k of Object.keys(option))
            this[ k ] = option[ k ];

        this.id = `piece-${this.nextId()}`;

        this.grandLivre = Injector.app.get(GrandLivre);
    }

    nextId() {
        let id = Piece.idByJournal[ this.journal ] || 0;
        Piece.idByJournal[ this.journal ] = ++id;

        return id;
    }

    addMouvement(...mouvementDataList: MouvementData<string | number>[]) {
        if (this.isClosed)
            throw new Error('Piece is closed');

        const mouvements = mouvementDataList.map(m => {
            const mouvement = new Mouvement({ pieceId: `${this.id}`, metadata: this as MouvementMetadata, data: m });
            this.grandLivre.add(mouvement);

            return mouvement;
        });

        this.mouvements.push(...mouvements);

        return this;
    }

    addMouvementPartieDouble({ montant, crediteur, debiteur }: MouvementPartieDouble) {
        this.addMouvement({ montant, compteInfo: debiteur, type: 'debit' });
        this.addMouvement({ montant, compteInfo: crediteur, type: 'credit' });

        return this;
    }

    private get credits() {
        // tslint:disable-next-line: no-parameter-reassignment
        return this.mouvements.filter(e => e.type === 'credit').reduce((sum, e) => sum += e.montant, 0);
    }

    private get debits() {
        // tslint:disable-next-line: no-parameter-reassignment
        return this.mouvements.filter(e => e.type === 'debit').reduce((sum, e) => sum += e.montant, 0);
    }

    get isBalanced() {
        if (Math.abs(this.credits - this.debits) > 0.01)
            return false;

        return true;
    }

    close() {
        if (!this.isBalanced)
            throw new Error(`Attention: la piece de ${this.libelle} n'est pas équilibrée: credit: ${this.credits.toFixed(2)} !== debit: ${this.debits.toFixed(2)}`);

        this.isClosed = true;
    }

    tryClose(): boolean {
        try {
            this.close();
            return true;
        } catch (e) {
            console.error(e.message);
            return false;
        }
    }

    // tslint:disable-next-line: function-name
    *[ Symbol.iterator ]() {
        yield* this.mouvements;
    }
}