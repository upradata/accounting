import { MouvementType } from '../util/types';
import { CompteInfo } from './compte';
import { flattenObject } from '../util/util';


export interface Lettrage {
    letter: string;
    date: Date;
}

export class MouvementData<MontantType extends number | string> {
    montant: MontantType = undefined;
    compteInfo: CompteInfo = undefined;
    type: MouvementType = undefined;
    lettrage?: Lettrage = undefined;
}

export class MouvementMetadata {
    libelle: string = undefined;
    date: Date = undefined;
    journal: string = undefined;
}

export interface MouvementOption {
    pieceId: string;
    metadata: MouvementMetadata;
    data: MouvementData<string | number>;
}

export class Mouvement {
    static ID = 0;
    id: string;
    pieceId: string;
    libelle: string;
    date: Date;
    journal: string;
    montant: number;
    compteInfo: CompteInfo;
    type: MouvementType;
    lettrage?: Lettrage;

    constructor(option: MouvementOption) {
        const opts = flattenObject<Mouvement>(option, { mergeKey: (k1, k2) => k2, nbLevels: 2 }); // we flatten option.data

        for (const k of Object.keys({ pieceId: '', ...new MouvementMetadata(), ...new MouvementData() })) {
            if (k !== 'montant' && opts[ k ])
                this[ k ] = opts[ k ];
        }

        this.montant = parseFloat((opts.montant + '').replace(',', '.'));
        this.id = 'mouvement-' + ++Mouvement.ID;
    }
}
