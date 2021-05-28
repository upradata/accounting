import { assignRecursive, AssignOptions } from '@upradata/util';
import { MouvementType, commaToNumber } from '@util';
import { CompteParentAux } from './compte';


export interface Lettrage {
    letter: string;
    date: Date;
}

export class MouvementData<MontantType extends number | string> {
    montant: MontantType = undefined;
    compteInfo: CompteParentAux = undefined;
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
    id: string = undefined;
    pieceId: string = undefined;
    libelle: string = undefined;
    date: Date = undefined;
    journal: string = undefined;
    montant: number = undefined;
    compteInfo: CompteParentAux = undefined;
    type: MouvementType = undefined;
    lettrage?: Lettrage = undefined;


    constructor(option: MouvementOption) {
        this.pieceId = option.pieceId;
        assignRecursive(this, option.data, new AssignOptions({ onlyExistingProp: true }));
        assignRecursive(this, option.metadata, new AssignOptions({ onlyExistingProp: true }));

        this.montant = commaToNumber(option.data.montant);
        this.id = `mouvement-${++Mouvement.ID}`;
    }
}
