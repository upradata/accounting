import { Arr, map, PartialRecursive, toObject } from '@upradata/util';
import { Injector, logger } from '@util';
import { Compte, CompteParentAux } from '@accounting';
import { PlanComptable, Journaux } from '@metadata';
import { ComptaDataNames, ComptaData } from './compta-data.types';
import { ImporterOption } from './importer-option';
import { ImporterFile, ImporterFiles } from './importer-input';
import { importJsonFromCsv, notMetadataComptaDataNames } from './csv-import';


export class Importer {
    private filenames: ImporterFiles<string>;

    constructor(private option: PartialRecursive<ImporterOption<ImporterFile>> = {}) { }

    async init() {
        const importerOption = new ImporterOption(this.option);
        await importerOption.init();

        this.filenames = {} as any;

        for (const [ k, filename ] of Object.entries(importerOption.files))
            this.filenames[ k ] = filename;
    }

    async importAll() {
        if (!this.filenames)
            await this.init();

        const createCompteParentAux = <T extends { compte: Compte; compteAux?: Compte; }>(datas: T[]): T[] => {
            return datas.map(data => ({
                ...data,
                compteInfo: new CompteParentAux({ compte: data.compte, compteAux: data.compteAux })
            }));
        };

        const { depenses, saisiePieces, depensesPieces, balanceReouverture } = await this.getDatas();

        console.log(); // jump 1 line for clarity

        return {
            depenses,
            saisiePieces: createCompteParentAux(saisiePieces),
            depensesPieces: createCompteParentAux(depensesPieces),
            balanceReouverture: createCompteParentAux(balanceReouverture)
        };
    }

    async getDatas() {
        const hasBeenLoaded = <T>(name: ComptaDataNames, data: T): T => {
            logger.info(`file for ${name} has been loaded: ${this.filenames[ name ]}`);
            return data;
        };

        const getCsvData = (name: ComptaDataNames) => importJsonFromCsv(this.filenames[ name ], name)
            .then(data => ({ name, data: hasBeenLoaded(name, data) }))
            .catch(e => {
                logger.error(`Error while loading file "${name}" in ${this.filenames[ name ]}`);
                logger.error(e);
                return { name, data: undefined };
            });

        const getCsvDatas = async <N extends ComptaDataNames>(names: Arr<N>): Promise<{ [ K in N ]: ComptaData[ K ] }> => {
            const datas = await Promise.all(names.map(getCsvData));
            return map(toObject(datas, 'name', 'value'), (_k, v) => v.data) as any;
        };

        // We need to load before these datas to create the rest as the rest depends on them
        // And Plan Comptable has to be the first one
        const { planComptable } = await getCsvDatas([ 'planComptable' ]);
        Injector.app.get(PlanComptable).add(...planComptable);

        const { journaux } = await getCsvDatas([ 'journaux' ]);
        Injector.app.get(Journaux).add(...journaux);

        return { planComptable, journaux, ...await getCsvDatas(notMetadataComptaDataNames) };
    }
}
