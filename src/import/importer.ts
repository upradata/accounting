import fs from 'fs-extra';
import { AppInjector } from '@upradata/dependency-injection';
import { Arr, map, PartialRecursive, toObject, ValueOf } from '@upradata/util';
import { logger } from '@util';
import { Compte, CompteParentAux, PlanComptable } from '@metadata/plan-comptable';
import { Journaux } from '@metadata/journaux';
import { ComptaDataNames, ComptaData } from './compta-data.types';
import { ImporterOption } from './importer-option';
import { ImporterFile, ImporterFiles } from './importer-input';
import { importJsonFromCsv, comptaDataNames, comptaDataHeaders } from './csv-import';


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

    async importAll(): Promise<ComptaData> {
        if (!this.filenames)
            await this.init();

        const createCompteParentAux = <T extends { compte: Compte; compteAux?: Compte; }>(rows: T[]): T[] => {
            return rows.map(data => ({
                ...data,
                compteInfo: new CompteParentAux({ compte: data.compte, compteAux: data.compteAux })
            }));
        };

        const datas = await this.getDatas();

        console.log(); // jump 1 line for clarity

        const isDataWithCompte = (rows: any): rows is ValueOf<ComptaData> extends (infer T)[] ? (T & { compte: Compte; compteAux?: Compte; })[] : never => {
            return rows && Object.keys(rows[ 0 ]).some(k => k.startsWith('compte'));
        };

        return map(datas, (name, rows) => {
            if (isDataWithCompte(rows) && name !== 'ecritureComptaGenerators')
                return createCompteParentAux(rows);

            return rows;
        }) as ComptaData;
    }

    async getDatas(): Promise<ComptaData> {
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
        AppInjector.root.get(PlanComptable).add(...planComptable);

        const { journaux } = await getCsvDatas([ 'journaux' ]);
        AppInjector.root.get(Journaux).add(...journaux);

        const rest = comptaDataNames.filter(name => name !== 'planComptable' && name !== 'journaux');

        const { toBeImported, optionalAbsent } = await rest.reduce(async (o$, name) => {
            const o = await o$;

            if (comptaDataHeaders[ name ].isOptional) {
                if (!await fs.pathExists(this.filenames[ name ])) {
                    o.optionalAbsent.push(name);
                    return o;
                }
            }

            o.toBeImported.push(name);
            return o;
        }, Promise.resolve({ toBeImported: [] as ComptaDataNames[], optionalAbsent: [] as ComptaDataNames[] }));


        return { planComptable, journaux, ...map(optionalAbsent, _ => undefined), ...await getCsvDatas(toBeImported) };
    }
}
