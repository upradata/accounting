import { TableColumnConfig } from '@upradata/node-util';
import { composeLeft, isUndefined, removeUndefined } from '@upradata/util';
import { Injector, formattedNumber, objectToArray } from '@util';
import { Edit, EditExtraOptions, coloryfyDiff } from '@edition';
import { Mouvement } from '../mouvement';
import { Pieces } from '../piece';
import { BalanceTotalData } from '../balance';
import { ComptesBalance } from '../balance-comptes';


interface AddToEditOption {
    compte: string;
    mouvement?: {
        type: Mouvement[ 'type' ];
        pieceId: Mouvement[ 'pieceId' ];
        montant: Mouvement[ 'montant' ];
        date: Mouvement[ 'date' ];
    };
    balanceTotal?: BalanceTotalData;
}

export class GrandLivreEdit extends Edit {
    private pieces: Pieces;
    private isShort = false;

    constructor(private compteBalance: ComptesBalance) {
        super({ title: 'Grand Livre Des Ecritures' });
        this.pieces = Injector.app.get(Pieces);
    }


    protected override doInit() {
        this.addHeaders(this.headers());
        this.setTableConfig((i, length) => ({ alignment: i >= length - 3 ? 'right' : 'left' }));
    }

    private headers() {
        if (this.isShort)
            return [ 'Compte', 'Débit', 'Crédit', 'Solde' ];

        return [ 'Compte', 'Date', 'Pièce', 'Période', 'Débit', 'Crédit', 'Solde' ];
    }


    private addToEdit({ compte, mouvement, balanceTotal }: AddToEditOption) {

        const getData = () => {
            if (isUndefined(balanceTotal)) {
                const { type, montant, date: d } = mouvement;

                const piece = this.pieces.get(mouvement.pieceId);
                const pieceId = `${mouvement.pieceId}: ${piece.libelle}`;

                const m = montant === 0 ? '' : montant; // formattedNumber(montant);

                return {
                    compte,
                    credit: type === 'credit' ? `${m}` : '',
                    debit: type === 'debit' ? `${m}` : '',
                    solde: '',
                    date: d ? d.toLocaleString('fr-FR', { year: 'numeric', month: 'numeric', day: 'numeric' }) : '',
                    period: piece.journal.toLowerCase() === 'xou' ? 'A-Nouveau' : 'Exercise',
                    pieceId
                };
            }

            return {
                compte,
                credit: balanceTotal.credit,
                debit: balanceTotal.debit,
                solde: balanceTotal.diff,
                date: undefined,
                period: undefined,
                pieceId: undefined
            };
        };


        const dataO = removeUndefined(this.isShort ? getData() : { ...getData(), date: undefined, period: undefined, pieceId: undefined });

        const row = objectToArray(dataO, [ 'compte', 'date', 'pieceId', 'period', 'debit', 'credit', 'solde' ]);


        const format = (data: string | number, i: number) => {
            const middleIndex = this.isShort ? 1 : 4;

            if (i <= middleIndex || i > middleIndex + 1)
                return `${data}`;

            formattedNumber(data, { zero: '' });
        };

        const colorify = (data: string | number, i: number, length: number) => {
            return i === length - 1 ? coloryfyDiff(data as number) : data;
        };


        this.addData({
            string: row.map(d => ({ value: d, format: s => composeLeft([ format, colorify ], s) })),
            json: { key: compte, value: dataO }
        });
    }


    protected override doEdit(option: EditExtraOptions) {

        for (const { key: compte, balanceData } of this.compteBalance) {
            const { mouvements, total } = balanceData;

            if (!option.short) {
                for (const mouvement of mouvements) {
                    this.addToEdit({ compte, mouvement });
                }
            }

            this.addToEdit({
                compte,
                balanceTotal: total.data
            });
        }
    }
}
