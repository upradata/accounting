import { values } from '@upradata/util';
import { AppInjector } from '@upradata/dependency-injection';
import { ComptaEcritureSimple, ComptaEcritureSimplePiece, EcritureSimpleData } from '@import/compta-data.types';
import { EcritureComptaGenerators } from '@metadata/ecriture-compta-generators';
import { logger, mapBy } from '@util';
import { Piece } from './piece';
import { getPiecesFromPieceRef } from './piece-factory-from-ref';
import { getPieceFromString } from './piece-factory-from-string';
import {
    generateFromLibelle,
    generatorFromType,
    PREDIFINED_GENERATORS,
    PREDIFINED_LIBELLE_GENERATORS
} from './pieces-generators';



export class PiecesFromEcrituresSimples {

    constructor(private ecrituresSimplesPieces: ComptaEcritureSimplePiece[]) { }

    getPieces(compteEcrituresSimples: ComptaEcritureSimple[]): Piece[] {
        const ecrituresById = mapBy(compteEcrituresSimples, 'id');

        const pieces: Piece[] = values(ecrituresById).flatMap(ecrituresSimples => ecrituresSimples.flatMap(ecritureSimple => {
            const { creditMouvement, debitMouvement, pieceRef, type, ...ecritureSimpleData } = ecritureSimple;

            if (pieceRef)
                return getPiecesFromPieceRef({ comptaEcritureSimplesPieces: this.ecrituresSimplesPieces, pieceRef, pieceOption: ecritureSimpleData });

            if (creditMouvement || debitMouvement)
                return getPieceFromString(creditMouvement, debitMouvement, ecritureSimpleData as Required<EcritureSimpleData>);

            if (type) {
                try {
                    const { generators } = AppInjector.root.get(EcritureComptaGenerators);

                    if (generators[ type ])
                        return generators[ type ](ecritureSimpleData);

                    return generatorFromType(PREDIFINED_GENERATORS)(type)(ecritureSimpleData);
                } catch (e) {
                    logger.error(e);
                    logger.info(`Let's try to generate from the "libelle"`);
                }
            }

            const pieces = generateFromLibelle(PREDIFINED_LIBELLE_GENERATORS)(ecritureSimpleData);

            if (pieces.length === 0)
                logger.error(`Impossible de générer de pièces pour la ligne avec le libellé "${ecritureSimpleData.libelle}".`);

            return pieces;
        })).filter(v => !!v);


        return pieces;
    }

}
